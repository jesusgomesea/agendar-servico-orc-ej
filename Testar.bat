@echo off
rem Dois cliques: sobe o site no computador e abre o navegador.
rem O painel de agendamentos saiu deste site (mora no Orca Aqui); aqui so o
rem montador publico e as rotas /api/catalogo e /api/recalcular.
rem Para parar: feche esta janela.
cd /d "%~dp0"

if not exist node_modules (
  echo Instalando dependencias pela primeira vez...
  call npm install --registry=https://registry.yarnpkg.com --no-audit --no-fund
)

echo.
echo  Site: http://localhost:3000
echo.
start "" cmd /c "timeout /t 6 /nobreak >nul & start http://localhost:3000"
set NEXT_TELEMETRY_DISABLED=1
call npx next dev -p 3000
pause
