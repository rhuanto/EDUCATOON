@echo off
cd /d %~dp0backend
call npm install
call npm run reset
pause
