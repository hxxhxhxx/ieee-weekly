import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

export async function loadConfig(file = path.join(ROOT, 'config.json')) {
  const raw = await readConfigFile(file);
  const cfg = merge(DEFAULTS, expandEnv(raw));
  cfg.llm.apiKey = cfg.llm.apiKey || process.env[cfg.llm.apiKeyEnv] || '';
  cfg.email.pass = cfg.email.pass || process.env.IEEE_WEEKLY_SMTP_PASS || '';
  cfg.email.user = cfg.email.user || process.env.IEEE_WEEKLY_SMTP_USER || '';
  cfg.email.from = cfg.email.from || cfg.email.user;
  return cfg;
}

/** 没有 config.json（刚 clone、CI 环境）时回落到 config.example.json。 */
async function readConfigFile(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    const fallback = path.join(ROOT, 'config.example.json');
    console.warn(`! 没找到 ${path.basename(file)}，改用 ${path.basename(fallback)}（复制一份填好邮箱即可）`);
    return JSON.parse(await readFile(fallback, 'utf8'));
  }
}

export function activeJournals(cfg) {
  return cfg.journals.filter((j) => j.enabled !== false);
}
