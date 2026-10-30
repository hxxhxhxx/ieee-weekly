# awesome-dsh-plugin 投稿材料

**状态：已提交（2026-10-30）**

- PR：<https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/10517>
- 分支：`hxxhxhxx:add-ieee-weekly`（fork 自 `hxxhxhxx/awesome-dsh-plugin`）
- 改动：仅新增 `data/plugins/hxxhxhxx__ieee-weekly.yml`（6 行）
- 仓库 topic `dsh-plugin` 已加（2026-10-30）\n- 已在 PR 下评论说明 topic 与 CI 结果；重开过一次（误点关闭，已 reopen，CI 重新排队）

目标仓库：<https://github.com/awesome-dsh-plugin/awesome-dsh-plugin>
投稿方式：一个 PR，只加一个文件 `data/plugins/hxxhxhxx__ieee-weekly.yml`
（文件已在 `docs/submission/hxxhxhxx__ieee-weekly.yml`，内容一致）

## 提交时间窗口（已完成）

贡献指南要求**仓库创建满 1 天**（CI 自动检查）。本仓库 `created_at` = 2026-10-29 03:34 UTC，
2026-10-30 11:34（北京时间）之后满足条件，实际提交于 11:45。

## 提交前检查清单

- [x] `package.json` 声明 `dsh.bundle.patch` → `./cordis.patch.yml`
- [x] 根目录有 `cordis.patch.yml`（`- insert: id/name`）
- [x] 已发布 npm 包 `dsh-ieee-weekly`（预构建安装，免构建授权）
- [x] 有真实代码（`src/` 10 个模块 + 插件入口 + 测试）
- [ ] 仓库加 `dsh-plugin` topic ← 待办
- [ ] 仓库满 1 天 ← 2026-10-30 11:34 之后

## 具体操作（明天）

```powershell
# 1. 克隆并拉分支（仓库已 fork 或直接用 gh）
git clone git@github.com:hxxhxhxx/awesome-dsh-plugin.git
cd awesome-dsh-plugin
git checkout -b add-ieee-weekly

# 2. 放入条目文件
mkdir data/plugins -Force
copy D:\Deepseek_workplace\ieee-weekly\docs\submission\hxxhxhxx__ieee-weekly.yml data\plugins\

# 3. 提交并推到 fork
git add data/plugins/hxxhxhxx__ieee-weekly.yml
git commit -m "Add hxxhxhxx/ieee-weekly"
git push -u origin add-ieee-weekly
```

然后在 GitHub 上对 `awesome-dsh-plugin/awesome-dsh-plugin` 开 PR（fork 的页面会提示 "Compare & pull request"）。

## PR 标题与正文

标题：

```
Add hxxhxhxx/ieee-weekly
```

正文：

```markdown
Adds [hxxhxhxx/ieee-weekly](https://github.com/hxxhxhxx/ieee-weekly) to `tools`.

**What it does.** Given a keyword list, it fetches the past N days of newly registered
DOIs for a whitelisted set of IEEE journals from Crossref, enriches each one through
IEEE Xplore (abstract, Early Access flag, authors), asks an LLM to score every paper
against the reader's research area, and emails a Markdown weekly digest. It also
registers an `ieee_weekly` tool so the agent can run the digest on demand.

- npm: https://www.npmjs.com/package/dsh-ieee-weekly (v0.1.1, 19 files, 30 kB)
- `dsh.bundle.patch` → `cordis.patch.yml` present; no `dsh.client` (no browser UI)
- Tool parameters: `days`, `dryRun`, `noEmail`, `ignoreSeen`, `limit`
- Data lives in `~/.ieee-weekly/` (config/state/reports), never inside `node_modules`
- CI (GitHub Actions): syntax check, config smoke test, plugin self-check

Range of the digest is limited by what Crossref exposes; only metadata and abstracts are
read, no full text is downloaded.
```

## 维护者可能问的问题

- **分类是不是该放 `tools`？** 它就是一个工具型插件（注册一个工具、背后跑一条流水线）。若维护者觉得 `workflow` 或 `docs` 更贴切，按指南他们会直接改，不会打回。
- **描述里的数字**：19 个文件 / 30 kB 是 `npm pack` 的实测值；`days` 等参数名与 `index.js` 里的 `parameters` 一致。
- **是否与已有条目重复**：目录里没有 IEEE / 文献监控类插件，`grep -i ieee data/plugins/` 为空。

## 参考

- 贡献指南：<https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md>
- 目录数据源：`data/plugins/*.yml` → 自动生成两个 README
- 市场索引：`https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json`（构建后才会含本插件）
