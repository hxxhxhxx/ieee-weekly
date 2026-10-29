#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, ROOT, activeJournals } from './config.mjs';
import { createIeeeClient } from './ieee.mjs';
import { discover, isSeen, isNegative, matchJournal } from './discover.mjs';
import { heuristicScore, llmScore, llmDigest, VERDICT_LABEL } from './screen.mjs';
import { buildMarkdown, buildHtml, buildSubject, fmtDate, shortJournal } from './report.mjs';
import { loadState, saveState } from './state.mjs';
import { emailReady, emailMissing, sendReport, sendTest } from './mail.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback = null) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
};

const log = (...a) => console.log(...a);

function todayInTz(tz = 'Asia/Shanghai') {
  const now = new Date();
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return s; // YYYY-MM-DD
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function stats(items) {
  const byJournal = {};
  for (const it of items) {
    const key = shortJournal(it.journal) || '其他';
    byJournal[key] ||= { total: 0, must: 0, worth: 0, keep: 0, skip: 0 };
    byJournal[key].total += 1;
    const v = it.analysis?.verdict;
    if (v && byJournal[key][v] !== undefined) byJournal[key][v] += 1;
  }
  return byJournal;
}

async function main() {
  const cfg = await loadConfig();
  const state = await loadState();

  if (flag('test-mail')) {
    if (!emailReady(cfg)) {
      log(`✗ 邮件配置不全：缺少 ${emailMissing(cfg).join('、')}`);
      process.exitCode = 2;
      return;
    }
    const info = await sendTest(cfg);
    log(`✓ 测试邮件已发送：${info.messageId}`);
    return;
  }

  const tz = cfg.timezone || 'Asia/Shanghai';
  const until = opt('until') || todayInTz(tz);
  const windowDays = Number(opt('days', cfg.windowDays)) || 7;
  const since = opt('since') || addDays(until, -(windowDays - 1));
  const dryRun = flag('dry-run');
  const noEmail = flag('no-email') || dryRun;
  const journals = activeJournals(cfg);

  log(`\n=== IEEE 期刊周报 ===`);
  log(`窗口：${since} → ${until}（${windowDays} 天）｜期刊：${journals.length} 种｜关键词：${cfg.keywords.length} 个`);

  const ieee = createIeeeClient(cfg);
  const t0 = Date.now();
  const seenForRun = flag('ignore-seen') ? { seen: {} } : state;

  log('\n[1/4] 抓取 + 用 IEEE 补摘要');
  const found = await discover(cfg, { since, until, seen: seenForRun, ieee, log });
  const access = found.access || {};
  log(`  抓取 ${found.items.length} 篇（Crossref ${found.crossrefCount} 条去重后；IEEE 补全 ${found.enriched} 篇）`);
  if (access.institute === false) log(`  ! 当前不是机构 IP，IEEE 摘要可能取不到`);

  log('\n[2/4] 关键词初筛 + 打分');
  const scored = found.items.map((it) => {
    const j = matchJournal(it.journal, journals);
    if (j) it.journalTier = j.tier;
    const a = heuristicScore(it, cfg);
    return { ...it, analysis: { ...a, ruleMetrics: a.metrics }, hasHit: a.hits.length > 0 };
  });
  const hits = scored.filter((it) => it.hasHit);
  log(`  关键词命中 ${hits.length}/${scored.length} 篇（其余与本方向无关，不进入研判）`);

  const capped = hits
    .sort((a, b) => b.analysis.score - a.analysis.score)
    .slice(0, Math.max(1, Number(opt('limit', cfg.llm.maxItems)) || 80));

  log('\n[3/4] 逐篇研判');
  let engine = '规则打分（关键词 + 新颖性 + 实测证据 + 期刊层级）';
  let llmUsed = false;
  if (cfg.llm.enabled && cfg.llm.apiKey) {
    const llm = await llmScore(capped, cfg, { log });
    if (llm) {
      llmUsed = true;
      engine = `大模型逐篇研判（${cfg.llm.model}）`;
      for (const it of capped) {
        const r = llm.get(it.doi);
        if (r) it.analysis = { ...it.analysis, ...r, ruleMetrics: it.analysis.ruleMetrics };
      }
      log(`  LLM 返回 ${llm.size} 篇`);
    } else {
      log('  ! LLM 调用失败，回落到规则打分');
    }
  } else {
    log('  (未配置 LLM key，使用规则打分；配置 DEEPSEEK_API_KEY 后自动切换)');
  }

  const evaluated = capped.sort((a, b) => (b.analysis.score ?? 0) - (a.analysis.score ?? 0));
  const counts = { must: 0, worth: 0, keep: 0, skip: 0 };
  for (const it of evaluated) counts[it.analysis.verdict] += 1;

  let digest = '';
  if (llmUsed) {
    const picks = evaluated.filter((it) => ['must', 'worth'].includes(it.analysis.verdict)).slice(0, 6);
    digest = await llmDigest(picks, cfg);
    if (digest) log(`  导读：${digest.slice(0, 60)}…`);
  }

  const meta = {
    dateLabel: until,
    since,
    until,
    windowDays,
    journalsCount: journals.length,
    fetched: found.items.length,
    evaluated: evaluated.length,
    engine,
    llmUsed,
    digest,
    errors: found.errors,
    byJournal: stats(evaluated),
    prefix: cfg.email.subjectPrefix || '[IEEE 周报]',
    access,
  };

  log('\n[4/4] 生成 Markdown' + (noEmail ? '' : ' + 发邮件'));
  const markdown = buildMarkdown({ items: evaluated, meta });
  const html = buildHtml({ items: evaluated, meta });
  const filename = `ieee-weekly-${until}.md`;
  const outDir = path.join(ROOT, 'reports');
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, filename);
  await writeFile(outFile, markdown, 'utf8');
  await writeFile(path.join(outDir, 'last-email.html'), html, 'utf8');
  await writeFile(
    path.join(outDir, 'last-run.json'),
    JSON.stringify({ meta, items: evaluated.map(({ title, doi, journal, isEarlyAccess, publishedAt, analysis }) => ({ title, doi, journal, isEarlyAccess, publishedAt, analysis })) }, null, 1),
    'utf8',
  );
  log(`  ✓ ${outFile}`);

  if (!noEmail) {
    if (!emailReady(cfg)) {
      log(`  ! 邮件未发送：缺少 ${emailMissing(cfg).join('、')}`);
    } else {
      try {
        const info = await sendReport({ cfg, subject: buildSubject({ meta, items: evaluated }), html, markdown, filename });
        log(`  ✓ 已发送至 ${cfg.email.to.join(', ')}（${info.messageId}）`);
      } catch (err) {
        log(`  ✗ 发信失败：${err.message}`);
        process.exitCode = 1;
      }
    }
  }

  if (!dryRun) {
    await saveState(state, evaluated);
    log(`  ✓ 已记录 ${evaluated.length} 篇到 state/seen.json，下周自动去重`);
  }

  log(`\n结果：必读 ${counts.must}｜值得看 ${counts.worth}｜存档 ${counts.keep}｜略过 ${counts.skip}`);
  log(`耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (found.errors.length) log(`抓取异常 ${found.errors.length} 条（见报告末尾）`);
}

main().catch((err) => {
  console.error('运行失败：', err?.stack || err?.message || err);
  process.exitCode = 1;
});
