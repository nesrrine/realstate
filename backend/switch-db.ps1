# Script pour basculer entre base de données locale et Neon
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("local", "neon")]
    [string]$Database
)

$envFile = ".env"
$localEnvFile = ".env.local"
$neonEnvFile = ".env.neon"

# Sauvegarder l'actuel .env comme .env.neon si ce n'est pas déjà fait
if (-not (Test-Path $neonEnvFile) -and (Test-Path $envFile)) {
    Write-Host "Sauvegarde de la configuration Neon..." -ForegroundColor Yellow
    Copy-Item $envFile $neonEnvFile
}

if ($Database -eq "local") {
    if (Test-Path $localEnvFile) {
        Write-Host "Basculement vers la base de données locale..." -ForegroundColor Green
        Copy-Item $localEnvFile $envFile -Force
        Write-Host "✓ Configuration locale activée" -ForegroundColor Green
        Write-Host ""
        Write-Host "Pour démarrer PostgreSQL localement avec Docker:" -ForegroundColor Cyan
        Write-Host "  cd .." -ForegroundColor White
        Write-Host "  docker-compose up -d" -ForegroundColor White
        Write-Host ""
        Write-Host "Puis exécutez les migrations:" -ForegroundColor Cyan
        Write-Host "  npx prisma migrate deploy" -ForegroundColor White
        Write-Host "  npx prisma generate" -ForegroundColor White
        Write-Host "  npx tsx prisma/seed.ts" -ForegroundColor White
    } else {
        Write-Host "Erreur: Le fichier .env.local n'existe pas" -ForegroundColor Red
        exit 1
    }
} elseif ($Database -eq "neon") {
    if (Test-Path $neonEnvFile) {
        Write-Host "Basculement vers la base de données Neon..." -ForegroundColor Green
        Copy-Item $neonEnvFile $envFile -Force
        Write-Host "✓ Configuration Neon activée" -ForegroundColor Green
    } else {
        Write-Host "Erreur: Le fichier .env.neon n'existe pas" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Redémarrez le serveur backend pour appliquer les changements." -ForegroundColor Yellow
