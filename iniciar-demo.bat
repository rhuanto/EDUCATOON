@echo off
cd /d %~dp0
where npm >nul 2>nul
if errorlevel 1 (
  echo No se encontro npm. Instala Node.js LTS primero.
  pause
  exit /b 1
)
echo Instalando dependencias raiz...
call npm install
echo Instalando dependencias backend...
call npm install --prefix backend
echo Instalando dependencias frontend...
call npm install --prefix frontend
echo Iniciando backend y frontend...
start "Educatoon Backend" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 3 /nobreak >nul
start "Educatoon Frontend" cmd /k "cd /d %~dp0frontend && npm run start"
echo.
echo Abre http://localhost:4200 en tu navegador.
pause
