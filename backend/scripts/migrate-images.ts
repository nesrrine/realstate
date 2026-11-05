import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function main() {
  const images = await prisma.propertyImage.findMany({
    where: { url: { startsWith: "/uploads/" } },
  });
  console.log(`${images.length} images à migrer`);

  let ok = 0;
  const missing: string[] = [];

  for (const img of images) {
    const localPath = path.join(process.cwd(), img.url.replace(/^\//, ""));
    if (!fs.existsSync(localPath)) {
      missing.push(img.url);
      continue;
    }
    try {
      const res = await cloudinary.uploader.upload(localPath, {
        folder: "real-estate/properties",
        resource_type: "image",
      });
      await prisma.propertyImage.update({
        where: { id: img.id },
        data: { url: res.secure_url },
      });
      ok++;
      if (ok % 25 === 0) console.log(`✅ ${ok} migrées`);
    } catch (e) {
      console.log(`⚠️ Erreur sur ${img.url}:`, (e as Error).message);
    }
  }

  console.log(`\nTerminé : ${ok} migrées, ${missing.length} fichiers introuvables`);
  fs.writeFileSync("missing-images.txt", missing.join("\n"));
}

main().finally(() => prisma.$disconnect());