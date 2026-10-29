/**
 * 插件自检：用假 ctx 加载 index.js，确认工具注册形状正确；
 * 加 --run 时会真的跑一次 dry-run（2 天窗口，不发信、不写状态）。
 */
import { apply } from '../index.js';

const captured = [];
const ctx = { tools: { register: (def) => captured.push(def) } };

apply(ctx);

const tool = captured[0];
const problems = [];
if (!tool) problems.push('没有注册任何工具');
else {
  if (tool.name !== 'ieee_weekly') problems.push(`工具名应为 ieee_weekly，实际 ${tool.name}`);
  if (typeof tool.execute !== 'function') problems.push('缺少 execute');
  if (!tool.parameters || typeof tool.parameters !== 'object') problems.push('缺少 parameters');
  if (!tool.output?.schema) problems.push('缺少 output.schema');
  if (typeof tool.output?.render !== 'function') problems.push('缺少 output.render');
}

if (problems.length) {
  console.error('✗ 插件自检失败：');
  for (const p of problems) console.error('  -', p);
  process.exit(1);
}

console.log('✓ 工具注册正常：', tool.name);
console.log('  参数：', Object.keys(tool.parameters).join(', '));
console.log('  描述：', tool.description.slice(0, 60) + '…');

if (process.argv.includes('--run')) {
  console.log('\n→ 真跑一次 dry-run（2 天）…');
  const text = await tool.execute({ days: 2, dryRun: true, noEmail: true }, { signal: undefined });
  console.log(text.split('\n').slice(0, 6).join('\n'));
}
