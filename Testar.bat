@echo off
rem Dois cliques: sobe o site no computador em MODO LOCAL e abre o navegador.
rem Modo local = painel sem login, agenda salva em .dados-locais\agenda.json
rem (ver lib\modoLocal.ts). Nao afeta o site publicado no Netlify.
rem Para parar: feche esta janela.
cd /d "%~dp0"

if not exist node_modules (
  echo Instalando dependencias pela primeira vez...
  call npm install --registry=https://registry.yarnpkg.com --no-audit --no-fund
)

rem Liga o modo local so neste computador (arquivo fora do git).
if not exist .env.development.local echo NEXT_PUBLIC_PAINEL_LOCAL=1> .env.development.local

echo.
echo  Site:   http://localhost:3000
echo  Painel: http://localhost:3000/painel
echo.
start "" cmd /c "timeout /t 6 /nobreak >nul & start http://localhost:3000"
set NEXT_TELEMETRY_DISABLED=1
call npx next dev -p 3000
pause
