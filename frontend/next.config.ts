import type { NextConfig } from "next";

// Adresse du backend vue par le serveur Next (pas par le navigateur).
// En Docker : http://backend:3001. Lue au build : à fournir avant `next build`.
const BACKEND_URL = (
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ??
  "http://localhost:3001"
).replace(/\/$/, "");

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};
module.exports = nextConfig;

export default nextConfig;