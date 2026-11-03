import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { runProductionChecks } from "./common/utils/production-checks";
import { isValidSignature, PRIVATE_PREFIX } from "./common/utils/signed-url";
import { SignPrivateUrlsInterceptor } from "./common/interceptors/sign-private-urls.interceptor";
import { IStorageService, STORAGE_SERVICE } from "./storage/storage.interface";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- syntaxe TS pour un module CommonJS
import compression = require("compression");
async function bootstrap() {
  await runProductionChecks();
  const app = await NestFactory.create(AppModule);
  const isProduction = process.env.NODE_ENV === "production";

  app.setGlobalPrefix("api");

  // Derrière le site (proxy Next.js / HTTPS de l'hébergeur) : vraie IP du visiteur via X-Forwarded-For,
  // en ne faisant confiance qu'aux proxys du réseau interne (le backend n'est pas exposé sur Internet).
  app.getHttpAdapter().getInstance().set("trust proxy", "loopback, linklocal, uniquelocal");
  app.getHttpAdapter().getInstance().disable("x-powered-by");

  // En-têtes de sécurité (équivalent helmet) : l'API ne sert que du JSON et des fichiers
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    res.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
    if (isProduction) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
  });

  // Documents privés : uniquement avec un lien signé et non expiré (remis au personnel connecté)
  const storage = app.get<IStorageService>(STORAGE_SERVICE);
  app.use(PRIVATE_PREFIX, (req, res, next) => {
    const path = PRIVATE_PREFIX + req.path.replace(/^\//, "");
    if (!isValidSignature(path, req.query.exp, req.query.sig)) {
      res.status(403).json({ statusCode: 403, message: "Lien expiré ou invalide : rouvrez le document depuis le CRM" });
      return;
    }
    res.setHeader("Cache-Control", "private, no-store");
    // Cloudinary : redirection vers un lien privé de 5 min ; en local : fichier servi depuis le disque
    const privateUrl = storage.privateUrl?.(req.path.replace(/^\//, ""));
    if (privateUrl) {
      res.redirect(302, privateUrl);
      return;
    }
    next();
  });
  app.useGlobalInterceptors(new SignPrivateUrlsInterceptor());

  // Compression HTTP (gzip / brotli) : réduit de 60 à 80 % la taille des réponses JSON.
  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers["x-no-compression"]) return false;
        return compression.filter(req, res);
      },
      threshold: 1024, // ne compresse que les réponses > 1 Ko
      level: 6,
    }),
  );

  // Cache-Control : les données du CRM sont privées et changent souvent.
  // Pas de cache navigateur/CDN : la mise en cache est gérée côté front par React Query.
  // Pour le site vitrine, remplace "/api/public" par le préfixe réel de tes routes publiques.
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();

    if (req.path.startsWith("/api/public")) {
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
    } else {
      res.setHeader("Cache-Control", "no-store");
    }
    next();
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  // FRONTEND_URL : une ou plusieurs adresses séparées par des virgules (ex. Vercel + nom de domaine).
  // En développement, tout port de localhost est accepté (site de dev 3000, aperçu de production 3002…).
  const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
  app.enableCors({
    origin: isProduction ? allowedOrigins : [...allowedOrigins, /^http:\/\/localhost:\d+$/],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  });

  // Swagger : documentation de toute l'API, réservée au développement
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle("Real Estate API")
      .setDescription("CRM & Platform API")
      .setVersion("1.0")
      .addBearerAuth(
        { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        "JWT",
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
  }

  // Arrêt propre (redéploiement Docker) : connexions Prisma fermées
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`Backend running on http://localhost:${port}/api`);
  if (!isProduction) console.log(`Swagger docs: http://localhost:${port}/api/docs`);
  console.log(`Health check: http://localhost:${port}/api/health`);
}

bootstrap();