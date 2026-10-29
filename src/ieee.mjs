import { request, sleep } from './http.mjs';

const SEARCH_URL = 'https://ieeexplore.ieee.org/rest/search';
const HEADERS = {
  accept: 'application/json, text/plain, */*',
  'content-type': 'application/json',
  origin: 'https://ieeexplore.ieee.org',
  referer: 'https://ieeexplore.ieee.org/search/searchresult.jsp',
};

export function createIeeeClient(cfg) {
  const delayMs = cfg.ieee?.delayMs ?? 450;
  const retries = cfg.ieee?.maxRetries ?? 3;
  let lastCall = 0;
  let access = null;

  async function throttle() {
    const wait = delayMs - (Date.now() - lastCall);
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
  }

  async function search(body) {
    await throttle();
    const { json } = await request(SEARCH_URL, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ highlight: false, returnType: 'SEARCH', matchPubs: true, rowsPerPage: '25', pageNumber: 1, ...body }),
      retries,
      timeoutMs: 45000,
      label: 'IEEE search',
    });
    if (json.userInfo) access = json.userInfo;
    return json;
  }

  /** 用 DOI 精确定位一篇，拿摘要 / Early Access 标记 / 作者。 */
  async function byDoi(doi) {
    const json = await search({ queryText: doi, rowsPerPage: '5' });
    const records = json.records || [];
    const hit = records.find((r) => String(r.doi || '').toLowerCase() === String(doi).toLowerCase()) || records[0];
    return hit ? normalize(hit) : null;
  }

  /** 关键词 + 最新排序，用来抓 Early Access 的最新条目。 */
  async function keywordNewest(keyword, pages = 2, rows = 100) {
    const out = [];
    for (let p = 1; p <= pages; p++) {
      const json = await search({ queryText: keyword, sortType: 'newest', rowsPerPage: String(rows), pageNumber: p });
      const recs = json.records || [];
      out.push(...recs.map(normalize));
      if (recs.length < rows) break;
    }
    return out;
  }

  function getAccess() {
    return access;
  }

  return { byDoi, keywordNewest, getAccess };
}

function normalize(r) {
  return {
    doi: String(r.doi || '').toLowerCase(),
    title: String(r.articleTitle || '').replace(/\s+/g, ' ').trim(),
    abstract: String(r.abstract || '').replace(/\s+/g, ' ').trim(),
    journal: r.publicationTitle || r.displayPublicationTitle || '',
    isEarlyAccess: r.isEarlyAccess === true,
    year: r.publicationYear || '',
    volume: r.volume || '',
    issue: r.issue || '',
    startPage: r.startPage || '',
    endPage: r.endPage || '',
    articleNumber: r.articleNumber || '',
    authors: (r.authors || []).map((a) => a.preferredName).filter(Boolean),
    contentType: r.contentType || '',
    citationCount: r.citationCount ?? null,
    xploreUrl: r.articleNumber ? `https://ieeexplore.ieee.org/document/${r.articleNumber}` : '',
    doiUrl: r.doi ? `https://doi.org/${r.doi}` : '',
  };
}
