
import type { NextConfig } from "next";

// Adresse du backend vue par le serveur Next
const BACKEND_URL = (
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ??
  "http://localhost:3001"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  images: {
    // Désactive l'optimisation Vercel pour éviter le quota 5K/5K
    unoptimized: true,

    // Autorise les images Cloudinary
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },

  env: {
    BACKEND_URL,
  },
};

export default nextConfig;
