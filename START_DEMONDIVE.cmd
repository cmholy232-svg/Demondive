@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo DemonDive needs Node.js 18 or newer.
  echo Download it from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)
node serve.mjs
if errorlevel 1 pause
