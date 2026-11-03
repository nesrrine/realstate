# Copie la base locale (backend/.env → DATABASE_URL) vers la base Neon.
# À lancer APRÈS scripts/transfert-cloudinary.js (pour copier les nouvelles adresses des photos).
#
#   powershell -ExecutionPolicy Bypass -File scripts\copie-base-neon.ps1
#
# Le script demande la chaîne de connexion Neon (non enregistrée, non affichée).
# La base Neon doit être vide : les tables existantes y sont remplacées.

$ErrorActionPreference = "Stop"
$pgBin = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin" -Directory | Sort-Object FullName -Descending | Select-Object -First 1
if (-not $pgBin) { throw "PostgreSQL introuvable (pg_dump)" }
$pgDump = Join-Path $pgBin.FullName "pg_dump.exe"
$pgRestore = Join-Path $pgBin.FullName "pg_restore.exe"

# Base locale : DATABASE_URL de backend/.env, sans les paramètres Prisma (?schema=...)
$envFile = Join-Path $PSScriptRoot "..\backend\.env"
$line = Select-String -Path $envFile -Pattern '^DATABASE_URL=' | Select-Object -First 1
if (-not $line) { throw "DATABASE_URL absent de backend/.env" }
$localUrl = ($line.Line -replace '^DATABASE_URL=', '').Trim('"', "'", ' ') -replace '\?.*$', ''

$secure = Read-Host "Collez la chaine de connexion Neon (directe, sans -pooler)" -AsSecureString
$neonUrl = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
if ($neonUrl -notmatch '^postgres(ql)?://') { throw "Chaine Neon invalide" }
if ($neonUrl -notmatch 'sslmode=') { $neonUrl += ($(if ($neonUrl -match '\?') { '&' } else { '?' }) + 'sslmode=require') }

$dump = Join-Path $env:TEMP "immo-base.dump"
Write-Host "1/2 Export de la base locale..."
& $pgDump --format=custom --no-owner --no-acl --file=$dump $localUrl
if ($LASTEXITCODE -ne 0) { throw "pg_dump a echoue" }

Write-Host "2/2 Import dans Neon..."
& $pgRestore --no-owner --no-acl --clean --if-exists --dbname=$neonUrl $dump
if ($LASTEXITCODE -ne 0) { Write-Warning "pg_restore a signale des avertissements (souvent sans gravite sur une base vide) : verifiez le CRM en ligne." }

Remove-Item $dump
Write-Host "Termine : la base est copiee sur Neon."
