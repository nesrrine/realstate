#!/bin/sh
# Sauvegarde de la base PostgreSQL et des photos/documents (volume « uploads »).
# À lancer sur le serveur, depuis le dossier du projet, par exemple chaque nuit (cron) :
#   0 3 * * * cd /chemin/du/projet && sh scripts/backup.sh >> backups/backup.log 2>&1
# Garde les 14 dernières sauvegardes. Copiez aussi le dossier backups/ hors du serveur
# (autre machine, stockage en ligne) : une sauvegarde sur le même disque ne protège pas d'une panne.
set -eu

ENV_FILE="${ENV_FILE:-.env.production}"
KEEP="${KEEP:-14}"
DIR="backups/$(date +%Y-%m-%d_%H%M)"
COMPOSE="docker compose --env-file $ENV_FILE"

# shellcheck disable=SC1090
. "./$ENV_FILE"
mkdir -p "$DIR"

echo "[$(date)] Sauvegarde vers $DIR"

# Base : format compressé de pg_dump (restauration avec pg_restore)
$COMPOSE exec -T postgres pg_dump -U "$POSTGRES_USER" -d "${POSTGRES_DB:-real_estate_db}" -Fc > "$DIR/base.dump"

# Fichiers : archive du dossier uploads du backend
$COMPOSE exec -T backend tar -czf - -C /app uploads > "$DIR/uploads.tar.gz"

echo "[$(date)] OK : $(du -sh "$DIR" | cut -f1)"

# Rotation : supprime les plus anciennes au-delà de $KEEP
ls -1d backups/20* 2>/dev/null | sort | head -n -"$KEEP" | while read -r old; do
  rm -rf "$old"
  echo "Ancienne sauvegarde supprimée : $old"
done

# Restauration (à faire à la main) :
#   cat backups/<date>/base.dump | docker compose --env-file .env.production exec -T postgres \
#     pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists
#   cat backups/<date>/uploads.tar.gz | docker compose --env-file .env.production exec -T backend \
#     tar -xzf - -C /app
