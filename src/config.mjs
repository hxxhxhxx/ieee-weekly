import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 数据目录：配置、state、reports 放这里。
 * 优先 IEEE_WEEKLY_HOME；本地开发（仓库里有 config.json）用仓库目录；
 * 作为 DSH 插件装进 node_modules 时回落到 ~/.ieee-weekly。
 */
export function resolveDataDir() {
  if (process.env.IEEE_WEEKLY_HOME) return path.resolve(process.env.IEEE_WEEKLY_HOME);
  if (existsSync(path.join(ROOT, 'config.json'))) return ROOT;
  return path.join(os.homedir(), '.ieee-weekly');
}

export const PATHS = {
  get home() {
    return resolveDataDir();
  },
  get reports() {
    return path.join(resolveDataDir(), 'reports');
  },
  get state() {
    return path.join(resolveDataDir(), 'state');
  },
  get config() {
    return path.join(resolveDataDir(), 'config.json');
  },
};

const DEFAULTS = {
  windowDays: 7,
  keywords: [],
  negativeKeywords: [],
  penaltyKeywords: [],
  journals: [],
  scoring: {
    weights: { relevance: 0.55, novelty: 0.2, evidence: 0.15, tier: 0.1 },
    relevanceDivisor: 22,
    subKeywordFactor: 0.5,
    offDomainCap: 0.25,
    minScore: 50,
    mustReadScore: 75,
    worthScore: 60,
    reviewPenalty: 0.55,
    offTopicPenalty: 0.7,
  },
  report: { mustReadMax: 6, worthMax: 10, keepMax: 20, language: 'zh' },
  llm: {
    enabled: true,
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    apiKey: '',
    batchSize: 6,
    maxItems: 80,
    temperature: 0.2,
    timeoutMs: 120000,
  },
  email: { enabled: true, host: '', port: 465, secure: true, user: '', pass: '', from: '', to: [], subjectPrefix: '[IEEE 周报]' },
  ieee: { delayMs: 450, maxRetries: 3, rowsPerPage: 25 },
};

/** `"${ENV:VAR}"` 形式的环境变量引用。 */
export function expandEnv(value) {
  if (typeof value === 'string') {
    const m = value.match(/^\$\{ENV:([A-Za-z0-9_]+)\}$/);
    return m ? (process.env[m[1]] ?? '') : value;
  }
  if (Array.isArray(value)) return value.map(expandEnv);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, expandEnv(v)]));
  }
  return value;
}

function merge(base, override) {
  if (override === undefined) return base;
  if (Array.isArray(override)) return override;
  if (override && typeof override === 'object' && !Array.isArray(override)) {
    const out = { ...base };
    for (const [k, v] of Object.entries(override)) out[k] = merge(base?.[k], v);
    return out;
  }
  return override;
}

export async function loadConfig(file = PATHS.config) {
  const raw = await readConfigFile(file);
  const cfg = merge(DEFAULTS, expandEnv(raw));
  cfg.llm.apiKey = cfg.llm.apiKey || process.env[cfg.llm.apiKeyEnv] || '';
  cfg.email.pass = cfg.email.pass || process.env.IEEE_WEEKLY_SMTP_PASS || '';
  cfg.email.user = cfg.email.user || process.env.IEEE_WEEKLY_SMTP_USER || '';
  cfg.email.from = cfg.email.from || cfg.email.user;
  return cfg;
}

/** 依次尝试：指定文件 → 数据目录 config.json → 仓库内 config.example.json（并播种到数据目录）。 */
async function readConfigFile(file) {
  const candidates = [file, PATHS.config, path.join(ROOT, 'config.example.json')];
  let lastErr;
  for (const [i, candidate] of candidates.entries()) {
    try {
      const raw = JSON.parse(await readFile(candidate, 'utf8'));
      const isExample = candidate.endsWith('config.example.json');
      if (isExample && i > 0) {
        // 首次以插件/全局安装方式运行：把示例配置播种到数据目录，之后改这里。
        try {
          await mkdir(PATHS.home, { recursive: true });
          await writeFile(PATHS.config, `${JSON.stringify(raw, null, 2)}\n`, 'utf8');
          console.warn(`! 已生成 ${PATHS.config}，填好邮箱与 API Key 后即可收周报`);
        } catch {
          /* 数据目录不可写时继续用示例运行 */
        }
      }
      return raw;
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      lastErr = err;
    }
  }
  throw new Error(`找不到配置文件：${file} / ${PATHS.config}；可复制 config.example.json 到 ${PATHS.config}。${lastErr ? ` (${lastErr.code})` : ''}`);
}

export function activeJournals(cfg) {
  return cfg.journals.filter((j) => j.enabled !== false);
}
