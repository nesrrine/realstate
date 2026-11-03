# ─── Build ───────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

# ─── Production ──────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production

# node_modules complet : la CLI prisma (devDependency) sert à « migrate deploy » au démarrage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./

# Photos et documents : dossier monté sur un volume (voir docker-compose.yml)
RUN mkdir -p uploads && chown node:node uploads
USER node

EXPOSE 3001
# Applique les migrations en attente, puis démarre l'API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
