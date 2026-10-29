# 发布到 GitHub / Gitee、以及 npm

**当前状态（2026-10-29）**

- GitHub 仓库已建好并推送：<https://github.com/hxxhxhxx/ieee-weekly>（8 个 topic、CI 绿）
- 本机走 Clash Verge 的 `127.0.0.1:7897` 代理访问 GitHub（`git config --global http.https://github.com.proxy`）
- 推送用 SSH：密钥 `~/.ssh/id_ed25519_github`，已加到账号（key 名 `SCUT-Windows ieee-weekly`），`core.sshCommand` 指向 Windows OpenSSH
- npm 包 `dsh-ieee-weekly@0.1.0` 已打包验证（`npm pack` 19 个文件 / 30KB，不含 config.json），**只差 npm 账号登录后发布**

## 1. GitHub（已完成）

```bash
git remote -v          # origin git@github.com:hxxhxhxx/ieee-weekly.git
git push               # 之后每次改完直接推
```

首次换机器时的准备：

```bash
git config --global http.https://github.com.proxy http://127.0.0.1:7897  # 有代理才需要
git config --global core.sshCommand "C:/Windows/System32/OpenSSH/ssh.exe" # Windows + MinGit
ssh-keygen -t ed25519 -C "you@example.com"                                # 然后把 .pub 加到 GitHub
```

## 2. Gitee（本机可直连，作为镜像）

```bash
git remote add gitee https://gitee.com/<你的账号>/ieee-weekly.git
git push -u gitee main
```

## 3. npm 发布（进了商城才算装上）

npm 发布必须用你自己的账号登录——这一步只能在你的终端里做，我无法代填密码：

```bash
cd D:\Deepseek_workplace\ieee-weekly
npm login                     # 浏览器会打开 npmjs.com，登录后确认
npm whoami                    # 应输出你的用户名
npm publish                   # 包名 dsh-ieee-weekly，非 scoped，不需要 --access public
```

没有 npm 账号就先在 <https://www.npmjs.com/signup> 注册（需要邮箱验证）。

发布前确认：

- `package.json` 里 `name` 是 `dsh-ieee-weekly`（非 scoped，直接 `npm publish` 即可）
- `npm pack --dry-run` 的输出里**不能**有 `config.json`、`state/`、`reports/`
- 想被 DSH 市场识别：`dsh` 字段 + `cordis.patch.yml` + `keywords: ["dsh-plugin"]` 已就位，
  `peerDependencies` 写成 `@deepseek-ai/dsh-tools": ">=0.2.1-rc.1 <0.3.0-0"`，市场会按这个做兼容性校验

发布后在 DSH 插件市场搜 `dsh-ieee-weekly` 安装；首次运行会在 `~/.ieee-weekly/config.json` 生成配置模板。

## 4. 提交前自检

```bash
git status --short          # 不应出现 config.json / state/ / reports/ / logs/
node src/cli.mjs --dry-run  # 能跑通
node tools/plugin-check.mjs # 插件注册形状正确
```
