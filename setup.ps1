# 一次性配置：把 DeepSeek Key 和邮箱授权码写进 config.json（不经过聊天窗口）
# 用法：右键"使用 PowerShell 运行"

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$cfgPath = Join-Path $root 'config.json'
$cfg = Get-Content $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json

Write-Host "=== IEEE 周报配置 ===" -ForegroundColor Cyan
Write-Host "直接回车 = 保持现有值。授权码/Key 输入时不回显。`n"

# ---- DeepSeek ----
$curKey = if ($cfg.llm.apiKey) { '已配置' } else { '未配置' }
Write-Host "DeepSeek API Key（当前：$curKey，用于逐篇研判；留空则用规则打分）"
$key = Read-Host "  Key" -AsSecureString
$keyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($key))
if ($keyPlain) { $cfg.llm.apiKey = $keyPlain }
if ($cfg.llm.model) { Write-Host "  模型：$($cfg.llm.model)（可在 config.json 改）" }

# ---- SMTP ----
Write-Host "`n发件邮箱（QQ/163/Gmail 都支持，需开启 SMTP 并使用『授权码』而非登录密码）"
$host_ = Read-Host "  SMTP 服务器 [$($cfg.email.host)]"
if ($host_) { $cfg.email.host = $host_ }

$user = Read-Host "  邮箱账号 [$($cfg.email.user)]"
if ($user) { $cfg.email.user = $user; if (-not $cfg.email.from) { $cfg.email.from = $user } }

$pass = Read-Host "  授权码（留空保持不变）" -AsSecureString
$passPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass))
if ($passPlain) { $cfg.email.pass = $passPlain }

$to = Read-Host "  收件人（多个用逗号分隔）[$($cfg.email.to -join ',')]"
if ($to) { $cfg.email.to = @($to -split '[,;，；]' | ForEach-Object { $_.Trim() } | Where-Object { $_ }) }

# ---- 保存 ----
$json = $cfg | ConvertTo-Json -Depth 20
[IO.File]::WriteAllText($cfgPath, $json, (New-Object Text.UTF8Encoding($false)))
Write-Host "`n✓ 已写入 $cfgPath" -ForegroundColor Green

if ($cfg.email.host -and $cfg.email.user -and $cfg.email.pass -and $cfg.email.to.Count -gt 0) {
  $ans = Read-Host "现在发一封测试邮件？(y/N)"
  if ($ans -match '^[yY]') {
    Push-Location $root
    node src\cli.mjs --test-mail
    Pop-Location
  }
}

Write-Host "`n下一步："
Write-Host "  立即跑一次周报：  .\run-weekly.cmd"
Write-Host "  装每周定时任务：  powershell -ExecutionPolicy Bypass -File .\install-task.ps1"
