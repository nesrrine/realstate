import { Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const logger = new Logger("ProductionChecks");

/** Comptes créés par prisma/seed.ts, avec leur mot de passe de démonstration. */
const DEMO_ACCOUNTS: [email: string, password: string][] = [
  ["admin@agency.com", "Admin1234!"],
  ["manager@agency.com", "Manager1234!"],
  ["agent@agency.com", "Agent1234!"],
];

/**
 * Vérifications au démarrage en production :
 * - JWT_SECRET présent et solide (sinon refus de démarrer : les sessions seraient falsifiables) ;
 * - comptes de démonstration encore actifs avec leur mot de passe connu → alerte dans les logs
 *   (pas de désactivation : le compte du gérant pourrait être l'un d'eux, il serait bloqué dehors).
 */
export async function runProductionChecks() {
  if (process.env.NODE_ENV !== "production") return;

  const secret = process.env.JWT_SECRET ?? "";
  if (secret.length < 32 || /your-secret|change-?me|secret-key/i.test(secret)) {
    throw new Error("JWT_SECRET absent ou trop faible : 32 caractères aléatoires minimum en production");
  }

  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      where: { email: { in: DEMO_ACCOUNTS.map(([e]) => e) }, isActive: true },
      select: { id: true, email: true, passwordHash: true },
    });
    for (const u of users) {
      const demoPassword = DEMO_ACCOUNTS.find(([e]) => e === u.email)?.[1];
      if (demoPassword && (await argon2.verify(u.passwordHash, demoPassword))) {
        logger.error(
          `⚠ ${u.email} utilise encore son mot de passe de démonstration (public) : ` +
            "changez-le immédiatement dans Profil, ou désactivez ce compte.",
        );
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}
