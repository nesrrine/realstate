import { createHmac, timingSafeEqual } from "crypto";

/**
 * Liens signés pour les documents privés (titres, contrats…) stockés sous /uploads/documents/.
 * Le lien n'est remis qu'au personnel connecté et expire : transmis à un tiers, il ne sert plus.
 */
export const PRIVATE_PREFIX = "/uploads/documents/";
const TTL_SECONDS = 60 * 60; // 1 heure

const secret = () => process.env.FILES_SECRET || process.env.JWT_SECRET || "dev-only-files-secret";
const signature = (path: string, exp: number) =>
  createHmac("sha256", secret()).update(`${path}:${exp}`).digest("base64url");

export function signPrivateUrl(path: string, ttlSeconds = TTL_SECONDS): string {
  const clean = path.split("?")[0];
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${clean}?exp=${exp}&sig=${signature(clean, exp)}`;
}

export function isValidSignature(path: string, exp: unknown, sig: unknown): boolean {
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Date.now() / 1000 || typeof sig !== "string") return false;
  const expected = Buffer.from(signature(path, expNum));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Parcourt une réponse JSON et signe chaque `url` de document privé. */
export function signPrivateUrls<T>(value: T): T {
  if (Array.isArray(value)) return value.map(signPrivateUrls) as T;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = k === "url" && typeof v === "string" && v.startsWith(PRIVATE_PREFIX) ? signPrivateUrl(v) : signPrivateUrls(v);
    }
    return out as T;
  }
  return value;
}
