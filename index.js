/**
 * DSH host plugin: 把 IEEE 周报流水线注册成模型可调用的 `ieee_weekly` 工具。
 *
 * 设计要点：
 * - 不强制依赖 @deepseek-ai/dsh-tools：拿得到 defineTool 就用，拿不到就传普通定义对象。
 * - 子进程跑本包自带的 CLI，配置/状态/报告都在数据目录（默认 ~/.ieee-weekly），
 *   不写 node_modules。
 * - 超时与中止都落到子进程上，避免把 harness 卡死。
 */
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const name = 'dsh-ieee-weekly';
export const inject = ['tools'];

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(DIR, 'src', 'cli.mjs');
const TIMEOUT_MS = 15 * 60 * 1000;
const MAX_OUTPUT = 4000;

let defineTool = (spec) => spec;
try {
  const mod = await import('@deepseek-ai/dsh-tools');
  if (typeof mod.defineTool === 'function') defineTool = mod.defineTool;
} catch {
  /* harness 没暴露 SDK 时退回普通定义对象 */
}

export function apply(ctx) {  const tool = defineTool({
    name: 'ieee_weekly',
    description:
      '生成 IEEE 期刊 Early Access 周报：按关键词抓取近 N 天新收录论文（Crossref + IEEE Xplore），' +
      '逐篇研判并按化合物工艺 PA 方向打分，输出 Markdown 周报，可选发邮件。数据目录默认 ~/.ieee-weekly。',
    parameters: {
      days: { type: 'number', description: '回看天数，默认 7' },
      dryRun: { type: 'boolean', description: '只生成不发送、不写去重状态' },
      noEmail: { type: 'boolean', description: '生成报告但不发邮件' },
      ignoreSeen: { type: 'boolean', description: '忽略已推送记录，重新研判全部候选' },
      limit: { type: 'number', description: '最多研判多少篇，默认取配置 llm.maxItems' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: String(value ?? '') }],
    },
    async execute(args, exec) {
      return runDigest(args ?? {}, exec);
    },
  });
  ctx.tools.register(tool);
}

export function dataDir() {
  return process.env.IEEE_WEEKLY_HOME || path.join(os.homedir(), '.ieee-weekly');
}

async function runDigest(args, exec) {
  const argv = [];
  if (args.days) argv.push(`--days=${args.days}`);
  if (args.dryRun) argv.push('--dry-run');
  if (args.noEmail) argv.push('--no-email');
  if (args.ignoreSeen) argv.push('--ignore-seen');
  if (args.limit) argv.push(`--limit=${args.limit}`);

  return await new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI, ...argv], {
      cwd: DIR,
      env: { ...process.env, IEEE_WEEKLY_HOME: dataDir() },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let out = '';
    let err = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill('SIGKILL');
        resolve(`⏱ 超时（15 分钟）：${tail(out) || tail(err)}`);
      }
    }, TIMEOUT_MS);

    const abort = () => {
      if (!settled) child.kill('SIGKILL');
    };
    exec?.signal?.addEventListener?.('abort', abort, { once: true });

    child.stdout.on('data', (d) => {
      out += d.toString('utf8');
    });
    child.stderr.on('data', (d) => {
      err += d.toString('utf8');
    });

    child.on('error', (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(`启动失败：${e.message}`);
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      exec?.signal?.removeEventListener?.('abort', abort);
      const report = /✓\s+(.+\.md)/.exec(out)?.[1];
      const lines = out.trim().split(/\r?\n/).slice(-14).join('\n');
      const body = [
        code === 0 ? '✅ IEEE 周报执行完成' : `❌ IEEE 周报退出码 ${code}`,
        report ? `报告：${report}` : '',
        lines ? `\n--- 运行输出（末尾）---\n${lines}` : '',
        code !== 0 && err ? `\n--- stderr ---\n${tail(err, 1200)}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      resolve(body);
    });
  });
}

function tail(text, max = MAX_OUTPUT) {
  const t = String(text || '').trim();
  return t.length > max ? `…${t.slice(-max)}` : t;
}
