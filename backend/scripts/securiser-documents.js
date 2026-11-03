/**
 * Déplace les documents des biens (titres, contrats…) vers uploads/documents/,
 * dossier privé servi uniquement par lien signé. Les photos restent publiques.
 *
 * Sans danger à relancer : les documents déjà déplacés sont ignorés.
 *   node scripts/securiser-documents.js            → aperçu, ne modifie rien
 *   node scripts/securiser-documents.js --executer → déplace et met à jour la base
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const EXECUTE = process.argv.includes("--executer");
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");

async function main() {
  const prisma = new PrismaClient();
  const docs = await prisma.propertyDocument.findMany({
    where: { NOT: { storageKey: { startsWith: "documents/" } } },
    select: { id: true, storageKey: true },
  });
  console.log(`${docs.length} document(s) à protéger${EXECUTE ? "" : " (aperçu : ajoutez --executer)"}`);

  fs.mkdirSync(path.join(UPLOAD_DIR, "documents"), { recursive: true });
  let moved = 0;
  let missing = 0;
  for (const doc of docs) {
    const newKey = `documents/${path.basename(doc.storageKey)}`;
    const from = path.join(UPLOAD_DIR, doc.storageKey);
    const to = path.join(UPLOAD_DIR, newKey);
    if (!fs.existsSync(from) && !fs.existsSync(to)) {
      missing++;
      console.warn(`  fichier introuvable : ${doc.storageKey}`);
      continue;
    }
    if (!EXECUTE) continue;
    // Déplacement (pas de copie : le disque est presque plein), puis mise à jour de la base
    if (fs.existsSync(from)) fs.renameSync(from, to);
    await prisma.propertyDocument.update({
      where: { id: doc.id },
      data: { storageKey: newKey, url: `/uploads/${newKey}` },
    });
    moved++;
  }
  console.log(EXECUTE ? `${moved} déplacé(s), ${missing} introuvable(s)` : `${missing} introuvable(s)`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
