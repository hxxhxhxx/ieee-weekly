# 注册每周自动运行的计划任务（默认每周一 08:00）
# 用法：右键"使用 PowerShell 运行"，或在 PowerShell 里执行：
#   powershell -ExecutionPolicy Bypass -File .\install-task.ps1
#   powershell -ExecutionPolicy Bypass -File .\install-task.ps1 -Day Friday -At 18:30

param(
  [ValidateSet('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')]
  [string]$Day = 'Monday',
  [string]$At = '08:00',
  [string]$TaskName = 'IEEE-Weekly-Digest'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$script = Join-Path $root 'run-weekly.cmd'

if (-not (Test-Path $script)) { throw "找不到 $script" }

$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c `"$script`"" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $Day -At $At
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
  -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings `
  -Description 'IEEE Xplore 期刊 Early Access 关键词周报：抓取 → 研判 → Markdown → 邮件' -Force | Out-Null

$task = Get-ScheduledTask -TaskName $TaskName
Write-Host "✓ 已注册计划任务：$TaskName"
Write-Host "  时间：每周 $Day $At"
Write-Host "  动作：$script"
Write-Host "  状态：$($task.State)"
Write-Host ""
Write-Host "立即试跑：Start-ScheduledTask -TaskName $TaskName"
Write-Host "查看结果：Get-ScheduledTaskInfo -TaskName $TaskName"
Write-Host "删除任务：Unregister-ScheduledTask -TaskName $TaskName -Confirm:`$false"
