# Script de vérification pré-déploiement
Write-Host "🔍 Vérification de la configuration pour le déploiement..." -ForegroundColor Cyan
Write-Host ""

$errors = 0
$warnings = 0

# Vérifier la structure des dossiers
Write-Host "📁 Vérification de la structure..." -ForegroundColor Yellow
if (Test-Path ".\backend\package.json") {
    Write-Host "  ✅ Backend présent" -ForegroundColor Green
} else {
    Write-Host "  ❌ Backend manquant" -ForegroundColor Red
    $errors++
}

if (Test-Path ".\frontend\package.json") {
    Write-Host "  ✅ Frontend présent" -ForegroundColor Green
} else {
    Write-Host "  ❌ Frontend manquant" -ForegroundColor Red
    $errors++
}

# Vérifier les fichiers de config
Write-Host ""
Write-Host "📝 Vérification des fichiers de configuration..." -ForegroundColor Yellow
if (Test-Path ".\render.yaml") {
    Write-Host "  ✅ render.yaml présent" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  render.yaml manquant" -ForegroundColor Yellow
    $warnings++
}

if (Test-Path ".\vercel.json") {
    Write-Host "  ✅ vercel.json présent" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  vercel.json manquant" -ForegroundColor Yellow
    $warnings++
}

if (Test-Path ".\DEPLOYMENT.md") {
    Write-Host "  ✅ DEPLOYMENT.md présent" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  DEPLOYMENT.md manquant" -ForegroundColor Yellow
    $warnings++
}

# Vérifier les fichiers .env.example
Write-Host ""
Write-Host "🔐 Vérification des fichiers d'environnement..." -ForegroundColor Yellow
if (Test-Path ".\backend\.env.example") {
    Write-Host "  ✅ backend/.env.example présent" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  backend/.env.example manquant" -ForegroundColor Yellow
    $warnings++
}

if (Test-Path ".\frontend\.env.production.example") {
    Write-Host "  ✅ frontend/.env.production.example présent" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  frontend/.env.production.example manquant" -ForegroundColor Yellow
    $warnings++
}

# Vérifier Prisma
Write-Host ""
Write-Host "🗄️  Vérification Prisma..." -ForegroundColor Yellow
if (Test-Path ".\backend\prisma\schema.prisma") {
    Write-Host "  ✅ schema.prisma présent" -ForegroundColor Green
} else {
    Write-Host "  ❌ schema.prisma manquant" -ForegroundColor Red
    $errors++
}

if (Test-Path ".\backend\prisma\seed.ts") {
    Write-Host "  ✅ seed.ts présent" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  seed.ts manquant" -ForegroundColor Yellow
    $warnings++
}

# Vérifier .gitignore
Write-Host ""
Write-Host "🔒 Vérification de la sécurité..." -ForegroundColor Yellow
if (Test-Path ".\.gitignore") {
    $gitignore = Get-Content ".\.gitignore" -Raw
    if ($gitignore -match "\.env") {
        Write-Host "  ✅ .env dans .gitignore" -ForegroundColor Green
    } else {
        Write-Host "  ❌ .env PAS dans .gitignore (DANGER!)" -ForegroundColor Red
        $errors++
    }
    if ($gitignore -match "node_modules") {
        Write-Host "  ✅ node_modules dans .gitignore" -ForegroundColor Green
    } else {
        Write-Host "  ❌ node_modules PAS dans .gitignore" -ForegroundColor Red
        $errors++
    }
} else {
    Write-Host "  ❌ .gitignore manquant" -ForegroundColor Red
    $errors++
}

# Vérifier que .env n'est PAS commité
if (Test-Path ".\backend\.env") {
    Write-Host "  ⚠️  backend/.env existe localement (ne pas commiter!)" -ForegroundColor Yellow
}

# Résumé
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "📊 RÉSUMÉ" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Erreurs   : $errors" -ForegroundColor $(if ($errors -eq 0) { "Green" } else { "Red" })
Write-Host "Warnings  : $warnings" -ForegroundColor $(if ($warnings -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

if ($errors -eq 0) {
    Write-Host "✅ Projet prêt pour le déploiement!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📖 Prochaines étapes :" -ForegroundColor Cyan
    Write-Host "  1. Consultez DEPLOYMENT.md pour les instructions détaillées"
    Write-Host "  2. Configurez votre base de données (Neon/Supabase/Render)"
    Write-Host "  3. Configurez Cloudinary pour le stockage d'images"
    Write-Host "  4. Déployez le backend sur Render"
    Write-Host "  5. Déployez le frontend sur Vercel"
} else {
    Write-Host "❌ Corrigez les erreurs avant de déployer" -ForegroundColor Red
}

Write-Host ""
