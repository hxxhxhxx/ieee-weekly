const NOVELTY_CUES = ['first', 'novel', 'record', 'state-of-the-art', 'state of the art', 'demonstrat', 'propose', 'new architecture', 'new design', 'breakthrough', 'unprecedented'];
const EVIDENCE_CUES = ['measur', 'experiment', 'fabricat', 'prototype', 'silicon', 'mmic', 'tested', 'characteriz', 'in measurement', 'die', 'chip'];
const REVIEW_CUES = ['review', 'survey', 'tutorial', 'overview', 'roadmap', 'perspective'];

export function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasPhrase(haystack, phrase) {
  const p = normalizeText(phrase);
  if (!p) return false;
  return ` ${haystack} `.includes(` ${p} `);
}

function countCues(text, cues) {
  let n = 0;
  for (const c of cues) if (text.includes(c)) n += 1;
  return n;
}

/** 规则打分：关键词命中 + 新颖性措辞 + 实测证据 + 期刊层级。 */
export function heuristicScore(item, cfg) {
  const title = normalizeText(item.title);
  const abs = normalizeText(item.abstract);
  const s = cfg.scoring;

  let coreScore = 0;
  let subScore = 0;
  const hits = [];
  const subFactor = s.subKeywordFactor ?? 0.5;
  for (const kw of cfg.keywords) {
    const aliases = [kw.term, ...(kw.aliases || [])];
    const inTitle = aliases.some((a) => hasPhrase(title, a));
    const inAbs = aliases.some((a) => hasPhrase(abs, a));
    if (kw.core) {
      if (inTitle) coreScore += kw.weight * 3;
      if (inAbs) coreScore += kw.weight;
    } else {
      if (inTitle) subScore += kw.weight * 3 * subFactor;
      if (inAbs) subScore += kw.weight * subFactor;
    }
    if (inTitle || inAbs) hits.push({ term: kw.term, where: inTitle ? 'title' : 'abstract', weight: kw.weight, core: Boolean(kw.core) });
  }

  let relevance = Math.min(1, (coreScore + subScore) / (s.relevanceDivisor || 22));
  const hasCore = coreScore > 0;
  if (!hasCore && s.offDomainCap != null) relevance = Math.min(relevance, s.offDomainCap);

  const novelty = Math.min(1, countCues(`${title} ${abs}`, NOVELTY_CUES) / 3);
  const numeric = /\d+(?:\.\d+)?\s*(?:%|dbm|db|ghz|w|mw)\b/.test(abs) ? 1 : 0;
  let evidence = Math.min(1, (countCues(abs, EVIDENCE_CUES) + numeric) / 3);
  const confidence = item.abstract ? 'high' : 'low';
  if (!item.abstract) evidence *= 0.6;

  const tier = item.journalTier === 1 ? 1 : item.journalTier === 2 ? 0.85 : 0.7;
  const haystack = `${title} ${abs}`;
  const reviewPenalty = REVIEW_CUES.some((c) => title.includes(c)) ? s.reviewPenalty : 1;
  const offTopic = (cfg.penaltyKeywords || []).some((k) => haystack.includes(normalizeText(k)));
  const process = processFactor(title, abs, cfg);
  const penalty = reviewPenalty * (offTopic ? (s.offTopicPenalty ?? 0.7) : 1) * process.factor;

  const w = s.weights;
  const raw = w.relevance * relevance + w.novelty * novelty + w.evidence * evidence + w.tier * tier;
  const score = Math.round(100 * raw * penalty);

  return {
    score,
    relevance,
    novelty,
    evidence,
    confidence,
    penalty,
    offTopic,
    process: process.kind,
    hits,
    metrics: extractMetrics(item.title, item.abstract),
    verdict: verdictOf(score, cfg),
    reason: ruleReason(hits, novelty, evidence, item, offTopic, process.kind),
    source: 'rule',
  };
}

/** 化合物工艺优先，纯硅工艺降权。 */
export function processFactor(title, abs, cfg) {
  const p = cfg.process || {};
  const hay = `${title} ${abs}`;
  const hasCompound = (p.compound || []).some((k) => hasPhrase(hay, k));
  if (hasCompound) return { kind: 'compound', factor: 1 };
  const hasSilicon = (p.silicon || []).some((k) => hasPhrase(hay, k));
  if (hasSilicon) return { kind: 'silicon', factor: p.siliconPenalty ?? 0.8 };
  return { kind: 'unknown', factor: p.neutralPenalty ?? 0.95 };
}

function ruleReason(hits, novelty, evidence, item, offTopic = false, processKind = 'unknown') {
  const top = hits
    .filter((h) => h.where === 'title')
    .sort((a, b) => Number(b.core) - Number(a.core) || b.weight - a.weight)
    .slice(0, 2)
    .map((h) => h.term);
  const parts = [];
  if (top.length) parts.push(`标题命中「${top.join('、')}」`);
  else if (hits.length) parts.push(`摘要命中「${hits[0].term}」`);
  else parts.push('未命中 PA 方向关键词');
  if (processKind === 'compound') parts.push('化合物工艺');
  if (processKind === 'silicon') parts.push('硅基工艺，已降权');
  if (offTopic) parts.push('主题疑似不在 PA 方向');
  if (novelty >= 0.66) parts.push('有明确新颖性表述');
  if (evidence >= 0.66) parts.push('含实测/流片证据');
  if (!item.abstract) parts.push('未取到摘要，置信度偏低');
  return parts.join('；');
}

export function verdictOf(score, cfg) {
  const s = cfg.scoring;
  if (score >= s.mustReadScore) return 'must';
  if (score >= s.worthScore) return 'worth';
  if (score >= s.minScore) return 'keep';
  return 'skip';
}

export const VERDICT_LABEL = { must: '必读', worth: '值得看', keep: '存档', skip: '略过' };

const METRIC_PATTERNS = [
  /(?:PAE|power added efficiency|drain efficiency)[^.;]{0,50}?\d{1,3}(?:\.\d+)?\s?%/gi,
  /\b\d{1,3}(?:\.\d+)?\s?%\s?(?:PAE|power added efficiency|efficiency)/gi,
  /(?:saturation power|output power|Pout|Psat|OP1dB)[^.;]{0,45}?\d{1,3}(?:\.\d+)?\s?(?:dBm|dB|W|mW)/gi,
  /\b\d{1,4}(?:\.\d+)?\s?[–-]\s?\d{1,4}(?:\.\d+)?\s?GHz/gi,
  /\b\d{1,4}(?:\.\d+)?\s?GHz\b/gi,
  /\b\d{1,3}(?:\.\d+)?\s?(?:dBm|dB)\b/gi,
];

export function extractMetrics(title, abstract) {
  const text = `${title || ''}. ${abstract || ''}`;
  const found = new Set();
  for (const re of METRIC_PATTERNS) {
    for (const m of text.matchAll(re)) {
      const v = m[0].replace(/\s+/g, ' ').trim();
      if (v.length >= 4 && v.length <= 60) found.add(v);
      if (found.size >= 8) break;
    }
  }
  return [...found].slice(0, 4);
}

/** 让 LLM 逐篇研判；失败则回落到规则打分。 */
export async function llmScore(items, cfg, { log = console.log } = {}) {
  if (!cfg.llm?.enabled || !cfg.llm.apiKey) return null;
  const batchSize = Math.max(1, cfg.llm.batchSize || 6);
  const results = new Map();
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) batches.push(items.slice(i, i + batchSize));

  let batchNo = 0;
  for (const batch of batches) {
    batchNo += 1;
    try {
      const payload = batch.map((it, idx) => ({
        id: idx + 1,
        title: it.title,
        journal: it.journal,
        early_access: it.isEarlyAccess,
        date: it.publishedAt || '',
        abstract: (it.abstract || '（无摘要）').slice(0, 1400),
      }));
      const content = await chat(cfg, [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `研究方向：射频/微波功率放大器（GaN/GaAs、Doherty、LMBA、负载调制、DPD、ET、MMIC）。\n\n待研判论文：\n${JSON.stringify(payload, null, 1)}\n\n只输出 JSON。` },
      ]);
      const parsed = parseJsonLoose(content);
      const list = parsed?.results || parsed?.items || (Array.isArray(parsed) ? parsed : []);
      for (const r of list) {
        const idx = Number(r.id) - 1;
        const it = batch[idx];
        if (!it) continue;
        const score10 = Math.max(0, Math.min(10, Number(r.score ?? 0)));
        const score = Math.round(score10 * 10);
        results.set(it.doi, {
          score,
          verdict: verdictOf(score, cfg),
          reason: String(r.reason || '').slice(0, 120),
          summary: String(r.summary || '').slice(0, 400),
          method: String(r.method || '').slice(0, 260),
          results: String(r.results || '').slice(0, 260),
          takeaway: String(r.takeaway || '').slice(0, 300),
          highlights: Array.isArray(r.highlights) ? r.highlights.slice(0, 3).map((x) => String(x).slice(0, 80)) : [],
          metrics: Array.isArray(r.metrics)
            ? r.metrics
                .map((x) => String(x).slice(0, 40))
                .filter((x) => x && !/未给出|没有给出|无具体|不详|N\/A|not (?:given|reported)/i.test(x))
                .slice(0, 4)
            : [],
          source: 'llm',
        });
      }
      log(`  LLM 研判 ${batchNo}/${batches.length}：${list.length}/${batch.length} 条`);
    } catch (err) {
      log(`  ! LLM 批次 ${batchNo} 失败：${err.message.slice(0, 120)}`);
    }
  }
  return results.size ? results : null;
}

const SYSTEM_PROMPT = `你是化合物半导体功率放大器方向的资深研究者，每周替同行筛 IEEE 新论文。

研究者画像（重要）：主攻 GaAs / GaN（含 InP、Ga2O3 等化合物半导体）功率放大器与 MMIC，关心 Doherty、LMBA、负载调制、包络跟踪、DPD、波形工程、宽带/高效 PA 架构与实测指标。

工艺权重（必须体现在评分里）：
- GaAs / GaN / InP / Ga2O3 等化合物工艺的 PA：主目标，正常评分。
- SiGe BiCMOS：次之，可略降。
- 纯 CMOS / SOI 的 PA：只在"方法可迁移到化合物工艺"时给中等分（5-6）；低功耗、植入式、生物医学、传感器供电类 CMOS PA 给 2-4。
- 与 PA 无关的器件/材料/封装/电力电子（如 GaN 开关、变换器、电阻、FSS）：0-2。

其他标准：
1. 相关性：是否直接做 PA 设计/线性化/负载调制/ET/DPD/MMIC，而不是泛泛提及 GaN。
2. 新颖性：新架构、新波形工程方法、新补偿思路，或给出新纪录。
3. 结果含金量：实测、流片、原型、完整指标（PAE、Pout、增益、带宽、线性度、调制信号测试）。
4. 可迁移性：做 GaAs/GaN PA 设计的读者能否直接借鉴。

打分 0-10：9-10 领域内必读；7-8 明显值得看；5-6 有参考价值；3-4 边缘；0-2 无关。

输出严格 JSON，不要多余文字：
{"results":[{
  "id":1,
  "score":8.5,
  "reason":"30 字以内中文，一句话结论：为什么值得/不值得读",
  "summary":"2-3 句中文，说清这篇论文做了什么（问题→方案→验证）",
  "method":"1-2 句：用了什么架构/工艺/算法/测试方式；看不出来就写“摘要未说明”",
  "results":"1-2 句：关键指标与结果；没有具体数字就写“摘要未给出指标”",
  "takeaway":"1-2 句：对做 GaAs/GaN PA 设计的人具体有什么用（可借鉴的手法、可对比的基准、可避开的坑）",
  "highlights":["一句话亮点"],
  "metrics":["PAE 62% @ 28 GHz 之类可直接摘出的数字"]
}]}`;

/** 全周一句话导读（只基于入选论文，不额外编造）。 */
export async function llmDigest(items, cfg) {
  if (!cfg.llm?.enabled || !cfg.llm.apiKey || !items.length) return '';
  try {
    const payload = items.map((it, i) => ({
      id: i + 1,
      title: it.title,
      journal: it.journal,
      point: it.analysis?.reason || '',
      summary: it.analysis?.summary || '',
    }));
    const content = await chat(cfg, [
      { role: 'system', content: '你是射频功率放大器方向的文献编辑，负责给每周简报写 2-3 句导读。只依据给定论文，不编造，不用“本文”“该文”开头，直接说这周有哪些值得注意的进展。' },
      { role: 'user', content: `本周入选论文：\n${JSON.stringify(payload, null, 1)}\n\n写 2-3 句中文导读，60-120 字，突出工艺（GaAs/GaN）与架构趋势。只输出导读正文。` },
    ]);
    return content.trim().replace(/^["“]|["”]$/g, '').slice(0, 400);
  } catch {
    return '';
  }
}

async function chat(cfg, messages) {
  const url = `${cfg.llm.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.llm.apiKey}` },
    body: JSON.stringify({ model: cfg.llm.model, messages, temperature: cfg.llm.temperature ?? 0.2, stream: false }),
    signal: AbortSignal.timeout(cfg.llm.timeoutMs || 120000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${text.slice(0, 160)}`);
  const json = JSON.parse(text);
  return json.choices?.[0]?.message?.content || '';
}

export function parseJsonLoose(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* fallthrough */
      }
    }
    return null;
  }
}
