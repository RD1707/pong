@echo off
setlocal

REM Define o diretório do script atual
set "SCRIPT_DIR=%~dp0"

REM Define o caminho para a pasta nodejs
set "NODE_DIR=%SCRIPT_DIR%nodejs"

REM Adiciona a pasta nodejs ao PATH para esta sessão do terminal
set "PATH=%NODE_DIR%;%PATH%"

REM Abre um novo terminal
start cmd /K "echo Ambiente Node.js configurado. && echo. && node -v && npm -v"

endlocal