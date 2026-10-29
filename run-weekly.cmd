@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist logs mkdir logs
echo. >> "logs\run.log"
echo ==== %DATE% %TIME% ==== >> "logs\run.log"
set NODE_EXE=D:\Program Files\nodejs\node.exe
if not exist "%NODE_EXE%" set NODE_EXE=node
"%NODE_EXE%" src\cli.mjs %* >> "logs\run.log" 2>&1
exit /b %ERRORLEVEL%
