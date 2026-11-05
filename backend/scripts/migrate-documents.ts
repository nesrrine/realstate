import { PrismaClient } from "@prisma/client";
import {
  v2 as cloudinary,
  UploadApiOptions,
  UploadApiResponse,
} from "cloudinary";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

const prisma = new PrismaClient();

const FOLDER = process.env.CLOUDINARY_FOLDER || "real-estate";
const LOCAL_FOLDER = path.join(process.cwd(), "uploads", "documents");

const LARGE_FILE_THRESHOLD = 20 * 1024 * 1024;

/**
 * true  : tous les fichiers (jpg, pdf, xlsx...) sont envoyés en "raw".
 *         Le public_id garde l'extension, ce qui correspond à l'URL
 *         .../raw/download?public_id=...jpg&type=private
 * false : les images sont envoyées en "image" (public_id sans extension).
 *         Dans ce cas, le code de téléchargement doit utiliser
 *         resource_type "image" + le paramètre format.
 */
const UPLOAD_ALL_AS_RAW = true;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

type ResourceType = "image" | "raw";

type MigrationResult = {
  file: string;
  status: "success" | "error" | "missing";
  url?: string;
  publicId?: string;
  error?: string;
};

const results: MigrationResult[] = [];

function getResourceType(fileName: string): ResourceType {
  if (UPLOAD_ALL_AS_RAW) {
    return "raw";
  }

  const extension = path.extname(fileName).toLowerCase();
  const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"];

  return imageExtensions.includes(extension) ? "image" : "raw";
}

function getPublicId(fileName: string, resourceType: ResourceType): string {
  const name = path.parse(fileName).name;

  // Cloudinary conserve l'extension dans le public_id des fichiers raw.
  const fileId = resourceType === "raw" ? fileName : name;

  return `${FOLDER}/documents/${fileId}`;
}

function getErrorMessage(error: any): string {
  if (error?.message) {
    return error.message;
  }

  if (error?.error?.message) {
    return error.error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function uploadDocument(
  localPath: string,
  fileName: string,
  resourceType: ResourceType
): Promise<UploadApiResponse> {
  const publicId = getPublicId(fileName, resourceType);
  const stats = fs.statSync(localPath);

  const options: UploadApiOptions = {
    public_id: publicId,
    resource_type: resourceType,
    type: "private",
    overwrite: true,
  };

  return new Promise<UploadApiResponse>((resolve, reject) => {
    const callback = (error: any, result?: UploadApiResponse) => {
      if (error || !result) {
        return reject(error ?? new Error("Réponse Cloudinary vide"));
      }
      resolve(result);
    };

    if (stats.size > LARGE_FILE_THRESHOLD) {
      cloudinary.uploader.upload_large(
        localPath,
        { ...options, chunk_size: 6 * 1024 * 1024 },
        callback
      );
    } else {
      cloudinary.uploader.upload(localPath, options, callback);
    }
  });
}

async function main() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Configuration Cloudinary manquante dans le fichier .env");
  }

  if (!fs.existsSync(LOCAL_FOLDER)) {
    throw new Error(`Dossier introuvable : ${LOCAL_FOLDER}`);
  }

  const docs = await prisma.propertyDocument.findMany({
    where: {
      url: {
        startsWith: "/uploads/documents/",
      },
    },
  });

  console.log("------------------------------------");
  console.log(" MIGRATION DES DOCUMENTS CLOUDINARY ");
  console.log("------------------------------------");
  console.log(`Documents trouvés : ${docs.length}`);

  let success = 0;
  let failed = 0;
  let missing = 0;

  for (let index = 0; index < docs.length; index++) {
    const doc = docs[index];
    const fileName = path.basename(doc.url);
    const localPath = path.join(LOCAL_FOLDER, fileName);

    console.log(`\n[${index + 1}/${docs.length}] ${fileName}`);

    if (!fs.existsSync(localPath)) {
      console.log("Fichier local introuvable.");

      missing++;
      results.push({ file: fileName, status: "missing" });
    } else {
      const resourceType = getResourceType(fileName);
      const fileSize = fs.statSync(localPath).size;

      console.log(
        `Type : ${resourceType} | Taille : ${(fileSize / 1024 / 1024).toFixed(2)} Mo`
      );

      try {
        const uploaded = await uploadDocument(
          localPath,
          fileName,
          resourceType
        );

        console.log("Upload réussi :", uploaded.public_id);

        await prisma.propertyDocument.update({
          where: { id: doc.id },
          data: {
            cloudinaryPublicId: uploaded.public_id,
            cloudinaryResourceType: resourceType,
            cloudinaryDeliveryType: "private",
          },
        });

        success++;
        results.push({
          file: fileName,
          status: "success",
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
        });
      } catch (error: any) {
        const message = getErrorMessage(error);

        console.error("ÉCHEC DE L'UPLOAD :", message);
        console.error("Détail de l'erreur :", error);

        failed++;
        results.push({
          file: fileName,
          status: "error",
          error: message,
        });
      }
    }

    // Sauvegarde progressive pour ne pas perdre les résultats.
    fs.writeFileSync(
      path.join(process.cwd(), "migration-results.json"),
      JSON.stringify(results, null, 2),
      "utf8"
    );
  }

  console.log("\n====================================");
  console.log("          RÉSULTAT FINAL");
  console.log("====================================");
  console.log(`Total : ${docs.length}`);
  console.log(`Réussis : ${success}`);
  console.log(`Échecs : ${failed}`);
  console.log(`Introuvables : ${missing}`);
  console.log("Résultats : migration-results.json");
}

main()
  .catch((error) => {
    console.error("Erreur générale :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });