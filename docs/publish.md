# 发布到 GitHub / Gitee、以及 npm

**当前状态（2026-10-29）**：GitHub 仓库已建好并推送完成 → <https://github.com/hxxhxhxx/ieee-weekly>

- 本机走 Clash Verge 的 `127.0.0.1:7897` 代理访问 GitHub（`git config --global http.https://github.com.proxy`）
- 推送用 SSH：密钥 `~/.ssh/id_ed25519_github`，已加到账号（key 名 `SCUT-Windows ieee-weekly`），`core.sshCommand` 指向 Windows OpenSSH
- 后续只需 `git push`

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

## 3. npm（如果要进 DSH 插件商城）

```bash
npm login
npm pack --dry-run          # 先确认没有把 config.json / state / reports 打进去
npm publish --access public # @mihexin/ieee-weekly 是 scoped 包，必须 --access public
```

发布前确认：

- `package.json` 的 `name` 换成你自己拥有的 scope（`@你的npm用户名/ieee-weekly`）
- 包里**不能**有 `config.json`（含 SMTP 授权码和 API key），`.gitignore` 已排除，但要靠 `npm pack --dry-run` 再核一遍
- 想被 DSH 市场识别为插件，还需要补 `dsh` 字段与 `peerDependencies`（见 README「开源与 DSH 插件」一节），并用 `cordis.patch.yml` 注入 host 入口

## 4. 提交前自检

```bash
git status --short          # 不应出现 config.json / state/ / reports/ / logs/
node src/cli.mjs --dry-run  # 能跑通
```
