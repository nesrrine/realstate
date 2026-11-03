/**
 * Envoie les photos et documents locaux (backend/uploads) vers Cloudinary
 * et met à jour leurs adresses dans la base. À lancer une fois avant la mise en ligne.
 *
 * Prérequis dans backend/.env : CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 * (et DATABASE_URL de la base à mettre à jour).
 *
 *   node scripts/transfert-cloudinary.js            → aperçu, n'envoie rien
 *   node scripts/transfert-cloudinary.js --executer → envoie et met à jour la base
 *
 * Reprise sans risque : ce qui est déjà sur Cloudinary est ignoré.
 * Les fichiers locaux ne sont pas supprimés (gardez-les comme sauvegarde).
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { v2: cloudinary } = require("cloudinary");
const { PrismaClient } = require("@prisma/client");

const EXECUTE = process.argv.includes("--executer");
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");
const FOLDER = process.env.CLOUDINARY_FOLDER || "real-estate";
const PARALLEL = 4;

for (const k of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) {
  if (!process.env[k]) {
    console.error(`${k} manquant dans backend/.env`);
    process.exit(1);
  }
}
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const prisma = new PrismaClient();
let done = 0;
let failed = 0;

async function run(items, label, handler) {
  console.log(`${label} : ${items.length} à envoyer`);
  if (!EXECUTE) return;
  const queue = [...items];
  await Promise.all(
    Array.from({ length: PARALLEL }, async () => {
      while (queue.length) {
        const item = queue.shift();
        try {
          await handler(item);
          done++;
        } catch (e) {
          failed++;
          console.warn(`  échec ${item.storageKey} : ${e.message}`);
        }
        if ((done + failed) % 100 === 0) console.log(`  … ${done + failed} traités`);
      }
    }),
  );
}

async function main() {
  // Photos : publiques, adresse https://res.cloudinary.com/...
  const images = await prisma.propertyImage.findMany({
    where: { url: { startsWith: "/uploads/" } },
    select: { id: true, storageKey: true },
  });
  await run(images, "Photos", async (img) => {
    const res = await cloudinary.uploader.upload(path.join(UPLOAD_DIR, img.storageKey), {
      public_id: `${FOLDER}/properties/${path.parse(img.storageKey).name}`,
      resource_type: "image",
      overwrite: false,
    });
    await prisma.propertyImage.update({
      where: { id: img.id },
      data: { url: res.secure_url, storageKey: res.public_id },
    });
  });

  // Documents : privés (raw/private), l'adresse « /uploads/documents/<nom> » ne change pas
  const docs = await prisma.propertyDocument.findMany({
    where: { storageKey: { startsWith: "documents/" } },
    select: { id: true, storageKey: true },
  });
  await run(docs, "Documents privés", async (doc) => {
    const name = path.basename(doc.storageKey);
    const res = await cloudinary.uploader.upload(path.join(UPLOAD_DIR, doc.storageKey), {
      public_id: `${FOLDER}/documents/${name}`,
      resource_type: "raw",
      type: "private",
      overwrite: false,
    });
    await prisma.propertyDocument.update({
      where: { id: doc.id },
      data: { storageKey: res.public_id, url: `/uploads/documents/${name}` },
    });
  });

  console.log(EXECUTE ? `Terminé : ${done} envoyé(s), ${failed} échec(s)` : "Aperçu seulement : ajoutez --executer");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
