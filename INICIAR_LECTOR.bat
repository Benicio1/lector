@echo off
title Lector Confort PDF - PWA Movil
cd /d "%~dp0"

echo ========================================================
echo   Iniciando Lector Confort PDF para Movil y PC...
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado o no figura en el PATH.
    pause
    exit /b 1
)

start "" http://localhost:8080
node server.mjs
pause
