const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export class HttpError extends Error {
  constructor(status, url, body) {
    super(`HTTP ${status} ${url}${body ? ` :: ${String(body).slice(0, 160)}` : ''}`);
    this.status = status;
    this.url = url;
    this.body = body;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 带超时、重试、退避的请求。默认解析 JSON；parse='text' 返回原文。
 */
export async function request(url, opts = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    timeoutMs = 30000,
    retries = 2,
    parse = 'json',
    label = '',
  } = opts;

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(800 * attempt + Math.random() * 400);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9', ...headers },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await res.text();
      if (!res.ok) throw new HttpError(res.status, url, text);
      if (parse === 'text') return { status: res.status, text, headers: res.headers };
      try {
        return { status: res.status, json: JSON.parse(text), text, headers: res.headers };
      } catch {
        throw new HttpError(res.status, `${url} (non-JSON)`, text);
      }
    } catch (err) {
      lastErr = err;
      const retriable = !(err instanceof HttpError) || err.status === 429 || err.status >= 500;
      if (!retriable) break;
      if (attempt < retries) console.warn(`  ↻ ${label || url} 失败（${err.message.slice(0, 80)}），重试 ${attempt + 1}/${retries}`);
    }
  }
  throw lastErr;
}

export { sleep, UA };
