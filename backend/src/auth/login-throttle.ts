import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * Protection contre la recherche de mot de passe par essais successifs.
 * - 5 échecs sur un même compte en 15 min → compte bloqué 15 min (même avec le bon mot de passe) ;
 * - 20 échecs depuis une même adresse IP en 15 min → adresse bloquée 15 min.
 * Mémoire du processus : suffisant pour un seul serveur backend.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_ACCOUNT = 5;
const MAX_PER_IP = 20;

const failures = new Map<string, number[]>();

const recent = (key: string, now: number) => (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
const accountKey = (email: string) => `email:${email.trim().toLowerCase()}`;
const ipKey = (ip: string) => `ip:${ip}`;

export function assertLoginAllowed(email: string, ip: string) {
  const now = Date.now();
  for (const [key, max] of [
    [accountKey(email), MAX_PER_ACCOUNT],
    [ipKey(ip), MAX_PER_IP],
  ] as const) {
    const hits = recent(key, now);
    if (hits.length >= max) {
      const waitMin = Math.ceil((WINDOW_MS - (now - hits[0])) / 60000);
      throw new HttpException(
        `Trop de tentatives de connexion. Réessayez dans ${waitMin} minute${waitMin > 1 ? "s" : ""}.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}

export function recordLoginFailure(email: string, ip: string) {
  const now = Date.now();
  for (const key of [accountKey(email), ipKey(ip)]) {
    failures.set(key, [...recent(key, now), now]);
  }
  // Ménage : évite que la table grossisse indéfiniment
  if (failures.size > 10_000) {
    for (const [key, hits] of failures) if (!hits.some((t) => now - t < WINDOW_MS)) failures.delete(key);
  }
}

export function clearLoginFailures(email: string) {
  failures.delete(accountKey(email));
}
