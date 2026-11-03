import type { NextConfig } from "next";

// Adresse du backend vue par le serveur Next (pas par le navigateur).
// En Docker : http://backend:3001. Lue au build : à fournir avant `next build`.
const BACKEND_URL = (
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ??
  "http://localhost:3001"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Image Docker légère (node server.js)
  output: "standalone",
  // Racine = dossier frontend (un autre package-lock.json existe à la racine du dépôt)
  outputFileTracingRoot: __dirname,

  // Photos et documents : enregistrés en « /uploads/... » (sans domaine),
  // servis par le backend derrière le même domaine que le site.
  // En-têtes de sécurité du site vitrine et du CRM
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Le site ne peut pas être affiché dans une iframe d'un autre site (anti-clickjacking)
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), geolocation=(self), microphone=(self), payment=()" },
      ...(process.env.NODE_ENV === "production"
        ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
        : []),
    ];
    // Espace du personnel : jamais indexé par Google
    const privateArea = [...security, { key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      { source: "/:path*", headers: security },
      { source: "/crm/:path*", headers: privateArea },
      { source: "/login", headers: privateArea },
    ];
  },

  // /api aussi : un seul domaine public (https://votre-domaine.tn) pour le site et l'API.
  async rewrites() {
    return [
      { source: "/uploads/:path*", destination: `${BACKEND_URL}/uploads/:path*` },
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
    ];
  },

  // Optimisation des imports des dépendances lourdes (tree-shaking automatique).
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "leaflet",
      "react-leaflet",
      "@tanstack/react-query",
    ],
  },

  // Images : activation du loader Cloudinary + optimisations locales.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "cloudinary.com",
      },
      // Anciennes adresses absolues (avant la migration en « /uploads/... »)
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/uploads/**",
      },
      // Production: same origin
      {
        protocol: "https",
        hostname: "*.vercel.app",
      },
    ],
    // Formats modernes + compression.
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    qualities: [75],
  },

  // Compression gzip/brotli côté serveur.
  compress: true,
  
  // Ignore ESLint during build for faster compilation
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;