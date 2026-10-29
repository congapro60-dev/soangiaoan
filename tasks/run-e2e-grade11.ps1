# Script điều khiển chạy E2E Toán 11 bằng PowerShell
$ErrorActionPreference = 'Continue'
$proj = "C:\Users\ADMIN\Downloads\spai-assistant-ph-hs"
Set-Location $proj

Write-Host ">>> Kéo env production..." -ForegroundColor Cyan
npx vercel env pull .env.probe --environment production --yes 2>&1 | Out-Null

Write-Host ">>> Thực thi E2E test Toán 11 qua PowerShell..." -ForegroundColor Yellow
node tasks/e2e-grade11-test.cjs

Write-Host ">>> Dọn dẹp .env.probe..." -ForegroundColor Cyan
Remove-Item ".env.probe" -Force -ErrorAction SilentlyContinue
