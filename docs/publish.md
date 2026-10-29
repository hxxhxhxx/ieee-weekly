# 发布到 GitHub / Gitee、以及 npm

本地仓库已经初始化并提交（`main` 分支）。剩下的是"建远端 + 推送 + 发 npm"。

## 1. GitHub

本机当前**连不上 github.com**（TCP 443 能连、TLS 被中断，`git ls-remote` 超时），所以推送前需要代理/VPN：

```bash
git config --global http.proxy http://127.0.0.1:7890   # 换成你自己的代理端口
# 或只用 SSH：ssh -T git@github.com 能通即可
```

然后用 GitHub CLI 或网页建仓：

```bash
git remote add origin https://github.com/<你的账号>/ieee-weekly.git
git push -u origin main
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
