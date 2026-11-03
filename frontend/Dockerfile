# ─── Build ───────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
RUN npm ci

COPY . .
# Lues au build par Next.js (inscrites dans le code envoyé au navigateur / dans les rewrites)
#   NEXT_PUBLIC_API_URL : adresse publique de l'API, ex. https://votre-domaine.tn/api
#   BACKEND_URL         : backend vu depuis le conteneur, pour servir /uploads et /api
ARG NEXT_PUBLIC_API_URL
ARG BACKEND_URL=http://backend:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL BACKEND_URL=$BACKEND_URL
RUN npm run build

# ─── Production (sortie « standalone ») ─────────────────────────────────────
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node

EXPOSE 3000
CMD ["node", "server.js"]
