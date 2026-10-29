import { listNewWorks, getWork } from './crossref.mjs';
import { activeJournals } from './config.mjs';
import { normalizeText, hasPhrase } from './screen.mjs';

/**
 * 抓取窗口内的候选论文：
 *  1) Crossref 按 ISSN 拉"最近 N 天新注册 DOI"（含 Early Access，日期精确）
 *  2) 可选：IEEE 关键词最新排序兜底，补 Crossref 尚未收录的 Early Access
 *  3) 逐篇用 IEEE 补摘要 / Early Access 标记 / 作者
 */
export async function discover(cfg, { since, until, seen, ieee, log = console.log }) {
  const journals = activeJournals(cfg);
  const byDoi = new Map();
  const errors = [];
  let crossrefCount = 0;

  for (const j of journals) {
    try {
      const works = await listNewWorks(j.issn, since, until);
      crossrefCount += works.length;
      for (const w of works) {
        if (!w.doi || byDoi.has(w.doi)) continue;
        if (isSeen(seen, w.doi)) continue;
        if (isNegative(w.title, cfg)) continue;
        byDoi.set(w.doi, { ...w, journalTier: j.tier, journalIssn: j.issn, source: 'crossref', publishedAt: (w.created || '').slice(0, 10) });
      }
      log(`  Crossref ${j.name}: ${works.length} 条`);
    } catch (err) {
      errors.push(`Crossref ${j.name}: ${err.message}`);
      log(`  ! Crossref ${j.name}: ${err.message.slice(0, 120)}`);
    }
  }

  const sweepPages = cfg.discovery?.keywordSweepPages ?? 0;
  if (sweepPages > 0) {
    let added = 0;
    for (const kw of cfg.keywords.slice(0, 8)) {
      try {
        const recs = await ieee.keywordNewest(kw.term, sweepPages, 100);
        for (const r of recs) {
          if (!r.doi || byDoi.has(r.doi) || isSeen(seen, r.doi) || !r.isEarlyAccess) continue;
          const j = matchJournal(r.journal, journals);
          if (!j || isNegative(r.title, cfg)) continue;
          const work = await getWork(r.doi);
          const created = (work?.created || '').slice(0, 10);
          if (created && (created < since || created > until)) continue;
          byDoi.set(r.doi, {
            doi: r.doi, title: r.title, journal: r.journal, created: work?.created || '',
            authors: r.authors, abstract: r.abstract, volume: '', issue: '', page: '',
            journalTier: j.tier, journalIssn: j.issn, source: 'ieee-sweep',
            publishedAt: created || '', ieeeRaw: r,
          });
          added += 1;
          if (added >= 40) break;
        }
      } catch (err) {
        errors.push(`IEEE 关键词兜底 ${kw.term}: ${err.message}`);
      }
      if (added >= 40) break;
    }
    if (added) log(`  IEEE 关键词兜底: 补充 ${added} 条`);
  }

  let enriched = 0;
  for (const item of byDoi.values()) {
    if (item.ieeeRaw) {
      Object.assign(item, pickIeee(item.ieeeRaw));
      empowered(item);
      continue;
    }
    try {
      const rec = await ieee.byDoi(item.doi);
      if (rec) {
        Object.assign(item, pickIeee(rec));
        empowered(item);
        enriched += 1;
      }
    } catch (err) {
      errors.push(`IEEE ${item.doi}: ${err.message.slice(0, 100)}`);
    }
  }

  const items = [...byDoi.values()].filter((it) => {
    if (it.publishedAt && (it.publishedAt < since || it.publishedAt > until)) return false;
    return true;
  });

  return { items, errors, crossrefCount, enriched, access: ieee.getAccess() };
}

function empowered(item) {
  item.hasAbstract = Boolean(item.abstract);
  item.isEarlyAccess = Boolean(item.isEarlyAccess);
}

function pickIeee(r) {
  return {
    title: r.title || '',
    abstract: r.abstract || '',
    journal: r.journal || '',
    isEarlyAccess: r.isEarlyAccess,
    year: r.year,
    volume: r.volume,
    issue: r.issue,
    startPage: r.startPage,
    endPage: r.endPage,
    articleNumber: r.articleNumber,
    authors: r.authors?.length ? r.authors : undefined,
    xploreUrl: r.xploreUrl,
    doiUrl: r.doiUrl,
    citationCount: r.citationCount,
    hasAbstract: Boolean(r.abstract),
  };
}

export function isSeen(seen, doi) {
  return Boolean(seen?.seen?.[String(doi).toLowerCase()]);
}

export function isNegative(title, cfg) {
  const t = normalizeText(title);
  return (cfg.negativeKeywords || []).some((k) => hasPhrase(t, k));
}

export function matchJournal(name, journals) {
  const n = normalizeText(name);
  let best = null;
  for (const j of journals) {
    const jn = normalizeText(j.name);
    if (!jn) continue;
    if (n === jn) return j;
    if (n.includes(jn) || jn.includes(n)) {
      if (!best || jn.length > normalizeText(best.name).length) best = j;
    }
  }
  return best;
}
