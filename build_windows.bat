@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo Extrator de Materias Windows Portable V1.25.9
echo ==============================================

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado.
  exit /b 1
)

call npm install --no-audit --no-fund
if errorlevel 1 exit /b 1

call npm run dist
if errorlevel 1 exit /b 1

if exist "dist\ExtratorNoticiasPortable-V1.25.9.exe" (
  echo.
  echo BUILD CONCLUIDO: dist\ExtratorNoticiasPortable-V1.25.9.exe
) else (
  echo.
  echo ERRO: executavel nao encontrado.
  exit /b 1
)

pause
