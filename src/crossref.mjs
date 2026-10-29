import { request } from './http.mjs';

const MAILTO = process.env.IEEE_WEEKLY_MAILTO || 'ieee-weekly@example.com';
const BASE = 'https://api.crossref.org';

/**
 * 拉取某 ISSN 在 [since, until] 内新收录（created）的期刊文章。
 * Crossref 的 created 时间就是 IEEE 把 Early Access 稿件注册 DOI 的时间，
 * 所以它比 IEEE 页面上的"Early Access"标记更适合做"最近 N 天"的判定。
 */
export async function listNewWorks(issn, since, until) {
  const filter = [
    `from-created-date:${since}`,
    `until-created-date:${until}`,
    'type:journal-article',
  ].join(',');
  const select = 'DOI,title,created,container-title,author,page,volume,issue,abstract,published';
  const items = [];
  let cursor = '*';

  for (let page = 0; page < 3; page++) {
    const url =
      `${BASE}/journals/${encodeURIComponent(issn)}/works?filter=${filter}` +
      `&rows=1000&cursor=${encodeURIComponent(cursor)}&select=${select}` +
      `&sort=created&order=desc&mailto=${encodeURIComponent(MAILTO)}`;
    const { json } = await request(url, { timeoutMs: 60000, retries: 2, label: `Crossref ${issn}` });
    const list = json?.message?.items || [];
    items.push(...list);
    cursor = json?.message?.['next-cursor'];
    if (!cursor || list.length < 1000) break;
  }

  return items.map(normalizeWork);
}

/** 单篇 DOI 的 Crossref 记录（主要用它的 created 收录时间）。 */
export async function getWork(doi) {
  try {
    const { json } = await request(`${BASE}/works/${encodeURIComponent(doi)}?mailto=${encodeURIComponent(MAILTO)}`, {
      timeoutMs: 30000,
      retries: 1,
      label: `Crossref ${doi}`,
    });
    return normalizeWork(json.message || {});
  } catch {
    return null;
  }
}

function normalizeWork(w) {
  const created = w.created?.['date-time'] || w.deposited?.['date-time'] || '';
  return {
    doi: String(w.DOI || '').toLowerCase(),
    title: cleanTitle(w.title?.[0]),
    journal: w['container-title']?.[0] || '',
    created,
    authors: (w.author || []).map((a) => a.family ? `${a.given ? `${a.given} ` : ''}${a.family}` : a.name).filter(Boolean),
    abstract: stripTags(w.abstract || ''),
    volume: w.volume || '',
    issue: w.issue || '',
    page: w.page || '',
  };
}

/** Crossref 标题里偶尔带 JATS 标签或多余空白。 */
export function cleanTitle(t) {
  if (!t) return '';
  return String(t)
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripTags(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
