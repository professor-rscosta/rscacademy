param(
    [string]$msg = "deploy: atualizacao RSC Academy"
)

Write-Host "🔨 Buildando frontend..." -ForegroundColor Cyan
Set-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Build falhou!" -ForegroundColor Red; exit 1 }
Set-Location ..

Write-Host "📦 Adicionando arquivos..." -ForegroundColor Cyan
git add -A
git add backend/public -f

Write-Host "💾 Commitando: $msg" -ForegroundColor Cyan
git commit -m $msg

Write-Host "🚀 Enviando para GitHub..." -ForegroundColor Cyan
git push

Write-Host "✅ Deploy concluído! Aguarde a Hostinger reimplantar." -ForegroundColor Green
Write-Host "🌐 https://rscacademy.com.br" -ForegroundColor Yellow