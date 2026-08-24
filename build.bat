@echo off
setlocal
cd /d "%~dp0"

echo =============================================
echo Extrator de Noticias Windows Portable V1.25.9
echo =============================================

where py >nul 2>nul
if %errorlevel%==0 (
  set PY=py
) else (
  set PY=python
)

%PY% -m pip install --upgrade pip
%PY% -m pip install -r requirements.txt
%PY% -m PyInstaller --noconfirm --clean --onefile --windowed --name "ExtratorNoticiasPortable-V1.25.9" extrator_noticias.py

if exist "dist\ExtratorNoticiasPortable-V1.25.9.exe" (
  echo.
  echo BUILD CONCLUIDO: dist\ExtratorNoticiasPortable-V1.25.9.exe
) else (
  echo.
  echo ERRO NO BUILD.
  exit /b 1
)
pause
