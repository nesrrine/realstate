import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

/**
 * Demo seed — development only.
 * Passwords are read from environment variables.
 * Never hardcode real credentials in source code.
 */
async function main() {
  // Comptes de démonstration aux mots de passe connus : jamais sur le serveur
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed de démonstration refusé en production");
  }
  const seeds = [
    {
      email: "admin@agency.com",
      password: process.env.SEED_ADMIN_PASSWORD ?? "Admin1234!",
      firstName: "Alice",
      lastName: "Admin",
      role: "ADMIN" as const,
    },
    {
      email: "manager@agency.com",
      password: process.env.SEED_MANAGER_PASSWORD ?? "Manager1234!",
      firstName: "Bob",
      lastName: "Manager",
      role: "MANAGER" as const,
    },
    {
      email: "agent@agency.com",
      password: process.env.SEED_AGENT_PASSWORD ?? "Agent1234!",
      firstName: "Carol",
      lastName: "Agent",
      role: "AGENT" as const,
    },
  ];

  for (const seed of seeds) {
    const existing = await prisma.user.findUnique({ where: { email: seed.email } });
    if (existing) {
      console.log(`  skip  ${seed.email} (already exists)`);
      continue;
    }

    const passwordHash = await argon2.hash(seed.password);
    await prisma.user.create({
      data: {
        email: seed.email,
        passwordHash,
        firstName: seed.firstName,
        lastName: seed.lastName,
        role: seed.role,
        agent: { create: {} },
      },
    });
    console.log(`  created ${seed.role.padEnd(7)} ${seed.email}`);
  }

  console.log("Seed completed.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
