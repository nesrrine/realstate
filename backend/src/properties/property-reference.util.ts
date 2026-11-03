import { Prisma } from "@prisma/client";

/** Génère REF-{année}-{seq 5 chiffres}, ex. REF-2026-00042 */
export async function generatePropertyReference(
  db: Prisma.TransactionClient | { property: Prisma.PropertyDelegate },
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `REF-${year}-`;

  const last = await db.property.findFirst({
    where: { reference: { startsWith: prefix } },
    orderBy: { reference: "desc" },
    select: { reference: true },
  });

  let seq = 1;
  if (last?.reference) {
    const tail = last.reference.slice(prefix.length);
    const parsed = parseInt(tail, 10);
    if (!Number.isNaN(parsed)) seq = parsed + 1;
  }

  return `${prefix}${String(seq).padStart(5, "0")}`;
}
