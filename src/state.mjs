import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { PATHS } from './config.mjs';

const MAX_SEEN = 5000;

function stateFile() {
  return path.join(PATHS.state, 'seen.json');
}

export async function loadState() {
  try {
    const raw = JSON.parse(await readFile(stateFile(), 'utf8'));
    return { version: 1, seen: raw.seen || {}, updatedAt: raw.updatedAt || '' };
  } catch {
    return { version: 1, seen: {}, updatedAt: '' };
  }
}

export async function saveState(state, items) {
  const now = new Date().toISOString();
  for (const it of items) {
    if (!it.doi) continue;
    state.seen[it.doi] = { firstSeen: now, title: it.title.slice(0, 200) };
  }
  const entries = Object.entries(state.seen).sort((a, b) => String(b[1].firstSeen).localeCompare(String(a[1].firstSeen)));
  state.seen = Object.fromEntries(entries.slice(0, MAX_SEEN));
  state.updatedAt = now;
  await mkdir(PATHS.state, { recursive: true });
  await writeFile(stateFile(), JSON.stringify(state, null, 1), 'utf8');
}
