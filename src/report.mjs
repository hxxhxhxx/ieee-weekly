import { VERDICT_LABEL } from './screen.mjs';

const CJK = /[\u4e00-\u9fa5]/;

export function fmtDate(d) {
  return d && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : '—';
}

const JOURNAL_ABBR = [
  [/journal of solid-state circuits/i, 'JSSC'],
  [/microwave theory and techniques/i, 'TMTT'],
  [/circuits and systems i/i, 'TCAS-I'],
  [/circuits and systems ii/i, 'TCAS-II'],
  [/microwave and wireless technology letters/i, 'MWTL'],
  [/solid-state circuits letters/i, 'SSC-L'],
  [/microwave magazine/i, 'IEEE MWM'],
  [/journal of microwaves/i, 'JMW'],
  [/transactions on electron devices/i, 'TED'],
  [/electron device letters/i, 'EDL'],
  [/microwave and wireless components letters/i, 'MWCL'],
  [/proceedings of the ieee/i, 'Proc. IEEE'],
];

export function shortJournal(name) {
  const raw = String(name || '').trim();
  if (!raw) return '—';
  for (const [re, abbr] of JOURNAL_ABBR) if (re.test(raw)) return abbr;
  return raw.replace(/^IEEE\s+/i, '').replace(/^Transactions on /i, 'Trans. ');
}

export function authorLine(authors, max = 3) {
  const list = (authors || []).filter(Boolean);
  if (!list.length) return '—';
  if (list.length <= max) return list.join(', ');
  return `${list.slice(0, max).join(', ')} 等 ${list.length} 人`;
}

function statusLabel(it) {
  return it.isEarlyAccess ? 'Early Access' : `正式期${it.volume ? ` ${it.volume}${it.issue ? `(${it.issue})` : ''}` : ''}`;
}

function linkLine(it) {
  const parts = [];
  if (it.doi) parts.push(`[DOI](https://doi.org/${it.doi})`);
  if (it.xploreUrl) parts.push(`[IEEE Xplore](${it.xploreUrl})`);
  return parts.join(' ｜ ');
}

function briefItem(it) {
  const a = it.analysis || {};
  const meta = [shortJournal(it.journal), statusLabel(it), fmtDate(it.publishedAt)];
  if (a.process && a.process !== '未说明') meta.push(a.process);
  const bits = [`**${it.title}**`, `（${meta.join('，')}）`];
  if (a.reason) bits.push(`— ${a.reason}`);
  if (a.summary) bits.push(`<br>　${a.summary.slice(0, 180)}`);
  if (it.doi) bits.push(`[DOI](https://doi.org/${it.doi})`);
  return `- ${bits.join(' ')}`;
}

export function buildMarkdown({ items, meta }) {
  const must = items.filter((i) => i.analysis?.verdict === 'must');
  const worth = items.filter((i) => i.analysis?.verdict === 'worth');
  const keep = items.filter((i) => i.analysis?.verdict === 'keep');
  const skip = items.filter((i) => i.analysis?.verdict === 'skip');
  const ea = items.filter((i) => i.isEarlyAccess).length;

  const L = [];
  L.push(`# IEEE 期刊周报 · ${meta.dateLabel}`);
  L.push('');
  L.push(
    `> 检索窗口 **${meta.since} → ${meta.until}**（近 ${meta.windowDays} 天）｜覆盖期刊 **${meta.journalsCount}** 种｜` +
      `抓取 **${meta.fetched}** 篇（Early Access ${ea}）｜关键词命中 **${items.length}** 篇｜研判 **${meta.evaluated}** 篇` +
      `｜推荐 **${must.length + worth.length}** 篇`,
  );
  L.push('');
  L.push(`数据源：Crossref（DOI 收录时间）＋ IEEE Xplore（摘要 / Early Access 标记）｜研判引擎：**${meta.engine}**`);
  L.push('');
  if (meta.digest) {
    L.push(`> **本期导读**：${meta.digest}`);
    L.push('');
  }
  L.push('---');
  L.push('');

  L.push(`## 一、本周必读（${must.length} 篇）`);
  L.push('');
  if (!must.length) {
    L.push('_本周没有达到"必读"阈值的论文。_');
    L.push('');
  }
  must.forEach((it, i) => {
    const a = it.analysis || {};
    L.push(`### ${i + 1}. ${it.title}`);
    L.push('');
    L.push(`- **期刊／状态**：${it.journal || '—'} ｜ ${statusLabel(it)}`);
    L.push(`- **上线日期**：${fmtDate(it.publishedAt)}${it.publishedAt ? '（Crossref 收录时间）' : ''}`);
    L.push(`- **作者**：${authorLine(it.authors)}`);
    if (a.process) L.push(`- **工艺**：${a.process === '未说明' ? '未说明（摘要未给出工艺）' : a.process}`);
    if (a.reason) L.push(`- **结论**：${a.reason}`);
    if (a.summary) L.push(`- **做了什么**：${a.summary}`);
    if (a.method) L.push(`- **方法**：${a.method}`);
    if (a.results) L.push(`- **结果**：${a.results}`);
    if (a.takeaway) L.push(`- **可借鉴**：${a.takeaway}`);
    if (a.highlights?.length) L.push(`- **亮点**：${a.highlights.join('；')}`);
    const metrics = a.metrics?.length ? a.metrics : a.ruleMetrics || [];
    if (metrics.length) L.push(`- **关键数据**：${metrics.join('；')}`);
    if (a.source === 'rule' && it.abstract) {
      const snippet = it.abstract.replace(/\s+/g, ' ').slice(0, 150);
      L.push(`- **摘要摘录**：${snippet}${it.abstract.length > 150 ? '…' : ''}`);
    }
    if (a.score != null) L.push(`- **评分**：${a.score}/100（${a.source === 'llm' ? '模型研判' : '规则打分'}）`);
    L.push(`- **链接**：${linkLine(it) || '—'}`);
    L.push('');
  });

  L.push(`## 二、值得一看（${worth.length} 篇）`);
  L.push('');
  if (!worth.length) L.push('_无。_');
  worth.forEach((it) => L.push(briefItem(it)));
  L.push('');

  L.push(`## 三、存档（${keep.length} 篇，相关但优先级低）`);
  L.push('');
  if (!keep.length) L.push('_无。_');
  keep.forEach((it) => L.push(briefItem(it)));
  L.push('');

  if (skip.length) {
    L.push(`## 四、已研判但判定略过（${skip.length} 篇，仅列标题）`);
    L.push('');
    skip.forEach((it) => L.push(`- ${it.title}（${shortJournal(it.journal)}，${fmtDate(it.publishedAt)}）`));
    L.push('');
  }

  L.push('## 本周统计');
  L.push('');
  L.push('| 期刊 | 研判 | 必读 | 值得看 | 存档 | 略过 |');
  L.push('| --- | ---: | ---: | ---: | ---: | ---: |');
  for (const [name, s] of Object.entries(meta.byJournal)) {
    L.push(`| ${name} | ${s.total} | ${s.must} | ${s.worth} | ${s.keep} | ${s.skip} |`);
  }
  L.push('');
  if (meta.errors.length) {
    L.push('## 抓取异常（不影响其余结果）');
    L.push('');
    meta.errors.slice(0, 10).forEach((e) => L.push(`- ${e}`));
    L.push('');
  }
  L.push('---');
  L.push('');
  L.push('## 关于这份周报');
  L.push('');
  L.push('**它做了什么**：每周自动检查这 10 本 IEEE 期刊在过去 7 天新注册的 DOI（含 Early Access），逐篇读摘要，按"化合物工艺功率放大器"方向打分，只把值得看的挑出来。');
  L.push('');
  L.push('**有什么用**：把"每周挨个期刊翻目录、读几十条标题和摘要"压缩成 3 分钟；Early Access 通常比正式见刊早 3-6 个月，能提前看到同行的新架构、新工艺与实测数据。');
  L.push('');
  L.push('**边界**：只读标题/摘要/元数据，不下载全文；评分只作筛选辅助，取舍仍看原文。');
  L.push('');
  L.push('_改关键词 / 期刊 / 收件人：编辑 `config.json` 后重跑。_');

  return L.join('\n');
}

export function buildSubject({ meta, items }) {
  const n = items.filter((i) => ['must', 'worth'].includes(i.analysis?.verdict)).length;
  return `${meta.prefix} ${meta.dateLabel}｜推荐 ${n} 篇 / 新收录 ${meta.fetched} 篇`;
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildHtml({ items, meta }) {
  const must = items.filter((i) => i.analysis?.verdict === 'must');
  const worth = items.filter((i) => i.analysis?.verdict === 'worth');
  const keep = items.filter((i) => i.analysis?.verdict === 'keep');
  const ea = items.filter((i) => i.isEarlyAccess).length;

  const row = (it) => `
    <div style="padding:16px 0;border-bottom:1px solid #e8e8e8">
      <div style="font-size:15px;font-weight:600;line-height:1.45;color:#111">${esc(it.title)}</div>
      <div style="margin-top:6px;font-size:12px;color:#777">
        ${esc(shortJournal(it.journal))} ｜ ${esc(statusLabel(it))} ｜ ${esc(fmtDate(it.publishedAt))}
        ${it.analysis?.process ? ` ｜ 工艺 ${esc(it.analysis.process)}` : ''}
        ${it.analysis?.score != null ? ` ｜ 评分 ${it.analysis.score}` : ''}
      </div>
      ${it.analysis?.reason ? `<div style="margin-top:8px;font-size:13px;color:#0b64c8"><b>结论：</b>${esc(it.analysis.reason)}</div>` : ''}
      ${it.analysis?.summary ? `<div style="margin-top:6px;font-size:13px;color:#333;line-height:1.7"><b>做了什么：</b>${esc(it.analysis.summary)}</div>` : ''}
      ${it.analysis?.method ? `<div style="margin-top:4px;font-size:13px;color:#333;line-height:1.7"><b>方法：</b>${esc(it.analysis.method)}</div>` : ''}
      ${it.analysis?.results ? `<div style="margin-top:4px;font-size:13px;color:#333;line-height:1.7"><b>结果：</b>${esc(it.analysis.results)}</div>` : ''}
      ${it.analysis?.takeaway ? `<div style="margin-top:4px;font-size:13px;color:#333;line-height:1.7"><b>可借鉴：</b>${esc(it.analysis.takeaway)}</div>` : ''}
      ${(it.analysis?.metrics?.length || it.analysis?.ruleMetrics?.length) ? `<div style="margin-top:4px;font-size:13px;color:#333"><b>关键数据：</b>${esc((it.analysis.metrics?.length ? it.analysis.metrics : it.analysis.ruleMetrics).join('；'))}</div>` : ''}
      ${it.abstract && it.analysis?.source === 'rule' ? `<div style="margin-top:4px;font-size:12px;color:#666;line-height:1.6">${esc(it.abstract.slice(0, 160))}${it.abstract.length > 160 ? '…' : ''}</div>` : ''}
      <div style="margin-top:8px;font-size:12px">
        ${it.doi ? `<a href="https://doi.org/${esc(it.doi)}" style="color:#0b64c8;text-decoration:none">DOI</a>` : ''}
        ${it.xploreUrl ? `&nbsp;·&nbsp;<a href="${esc(it.xploreUrl)}" style="color:#0b64c8;text-decoration:none">IEEE Xplore</a>` : ''}
      </div>
    </div>`;

  const bullet = (it) => `<li style="margin:6px 0;font-size:13px;color:#222">
      <b>${esc(it.title)}</b><br><span style="color:#777;font-size:12px">${esc(shortJournal(it.journal))} · ${esc(statusLabel(it))} · ${esc(fmtDate(it.publishedAt))}${it.analysis?.process && it.analysis.process !== '未说明' ? ` · 工艺 ${esc(it.analysis.process)}` : ''}</span>
      ${it.analysis?.reason ? `<br><span style="color:#444">${esc(it.analysis.reason)}</span>` : ''}
      ${it.doi ? ` <a href="https://doi.org/${esc(it.doi)}" style="color:#0b64c8;text-decoration:none">DOI</a>` : ''}
    </li>`;

  return `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei',sans-serif">
  <div style="max-width:760px;margin:0 auto;background:#fff;padding:28px 30px">
    <div style="font-size:13px;color:#888;letter-spacing:.5px">IEEE WEEKLY DIGEST</div>
    <h1 style="margin:6px 0 4px;font-size:22px;color:#111">IEEE 期刊周报 · ${esc(meta.dateLabel)}</h1>
    <div style="font-size:12px;color:#666;line-height:1.7">
      窗口 ${esc(meta.since)} → ${esc(meta.until)}（近 ${meta.windowDays} 天）<br>
      覆盖期刊 ${meta.journalsCount} 种 · 抓取 ${meta.fetched} 篇（Early Access ${ea}）· 研判 ${meta.evaluated} 篇 · 推荐 <b>${must.length + worth.length}</b> 篇<br>
      研判引擎：${esc(meta.engine)}
    </div>
    ${meta.digest ? `<div style="margin-top:14px;padding:12px 14px;background:#f3f7fd;border-left:3px solid #0b64c8;font-size:13px;line-height:1.8;color:#22333f"><b>本期导读</b><br>${esc(meta.digest)}</div>` : ''}
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:18px 0">

    <h2 style="font-size:16px;color:#111;margin:18px 0 6px">一、本周必读（${must.length}）</h2>
    ${must.length ? must.map(row).join('') : '<div style="color:#888;font-size:13px">本周没有达到必读阈值的论文。</div>'}

    <h2 style="font-size:16px;color:#111;margin:24px 0 6px">二、值得一看（${worth.length}）</h2>
    ${worth.length ? `<ul style="padding-left:18px;margin:0">${worth.map(bullet).join('')}</ul>` : '<div style="color:#888;font-size:13px">无。</div>'}

    <h2 style="font-size:16px;color:#111;margin:24px 0 6px">三、存档（${keep.length}）</h2>
    ${keep.length ? `<ul style="padding-left:18px;margin:0">${keep.map(bullet).join('')}</ul>` : '<div style="color:#888;font-size:13px">无。</div>'}

    <div style="margin-top:26px;padding:16px 18px;background:#fafafa;border:1px solid #eee;font-size:12px;color:#555;line-height:1.8">
      <b style="color:#111">关于这份周报</b><br>
      <b>做了什么：</b>每周自动检查这些 IEEE 期刊过去 7 天新注册的 DOI（含 Early Access），逐篇读摘要、按"化合物工艺功率放大器"方向打分，只把值得看的挑出来。<br>
      <b>有什么用：</b>把"挨个期刊翻目录、读几十条标题摘要"压缩成 3 分钟；Early Access 通常比正式见刊早 3-6 个月。<br>
      <b>边界：</b>只读标题/摘要/元数据，不下载全文；评分只作筛选辅助，取舍仍看原文。<br>
      修改关键词 / 期刊 / 收件人：编辑 <code>config.json</code> 后重跑。
    </div>
    <div style="margin-top:14px;font-size:11px;color:#999;line-height:1.7">
      自动生成 · 完整 Markdown 见附件
    </div>
  </div></body></html>`;
}
