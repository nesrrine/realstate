import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { v2 as cloudinary } from "cloudinary";
import { IStorageService, StorageFolder, UploadedFile } from "./storage.interface";

/**
 * Stockage Cloudinary (hébergement sans disque persistant, ex. Render gratuit).
 *   .env : STORAGE_DRIVER=cloudinary
 *          CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 *          CLOUDINARY_FOLDER=real-estate (optionnel)
 *
 * - Photos : images publiques (site vitrine), URL https://res.cloudinary.com/...
 * - Documents : fichiers « raw » de type private, jamais accessibles directement.
 *   L'API renvoie « /uploads/documents/<nom> », signé par le backend (1 h) ; une fois la signature
 *   vérifiée, le backend redirige vers un lien Cloudinary de téléchargement qui expire en 5 minutes.
 */
@Injectable()
export class CloudinaryStorageService implements IStorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);
  private readonly folder: string;

  constructor(config: ConfigService) {
    const cloudName = config.get<string>("CLOUDINARY_CLOUD_NAME");
    const apiKey = config.get<string>("CLOUDINARY_API_KEY");
    const apiSecret = config.get<string>("CLOUDINARY_API_SECRET");
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Missing CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET");
    }
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
    this.folder = config.get<string>("CLOUDINARY_FOLDER", "real-estate");
  }

  private documentId(fileName: string) {
    return `${this.folder}/documents/${fileName}`;
  }

  async upload(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder: StorageFolder = "properties",
  ): Promise<UploadedFile> {
    if (folder === "documents") {
      const fileName = `${uuidv4()}${path.extname(originalName).toLowerCase()}`;
      const result = await this.send(buffer, {
        public_id: this.documentId(fileName),
        resource_type: "raw",
        type: "private",
      });
      this.logger.log(`Document privé envoyé : ${result.public_id}`);
      return {
        url: `/uploads/documents/${fileName}`,
        key: result.public_id,
        size: result.bytes,
        mimeType,
        originalName,
      };
    }

    const result = await this.send(buffer, { folder: `${this.folder}/properties`, resource_type: "image" });
    this.logger.log(`Photo envoyée : ${result.public_id}`);
    return { url: result.secure_url, key: result.public_id, size: result.bytes, mimeType, originalName };
  }

  /** Lien de téléchargement temporaire d'un document privé (redirection après vérification). */
  privateUrl(fileName: string): string {
    return cloudinary.utils.private_download_url(this.documentId(fileName), "", {
      resource_type: "raw",
      type: "private",
      expires_at: Math.floor(Date.now() / 1000) + 300,
    });
  }

  async read(key: string): Promise<Buffer> {
    try {
      let url: string;
      
      if (this.isDocument(key)) {
        // Pour les documents privés, utiliser l'API Cloudinary Admin au lieu de l'URL signée
        this.logger.log(`Reading private document from Cloudinary: ${key}`);
        
        try {
          // Utiliser l'API admin pour récupérer le contenu du fichier
          const result = await cloudinary.api.resource(key, {
            resource_type: 'raw',
            type: 'private',
          });
          
          // Télécharger directement depuis l'URL sécurisée
          const response = await fetch(result.secure_url);
          if (!response.ok) {
            throw new Error(`Failed to fetch from secure URL: ${response.status} ${response.statusText}`);
          }
          
          const buffer = Buffer.from(await response.arrayBuffer());
          this.logger.log(`Successfully read ${buffer.length} bytes from private document ${key}`);
          return buffer;
        } catch (apiError) {
          this.logger.error(`API method failed, trying signed URL fallback: ${apiError.message}`);
          // Fallback: utiliser l'URL signée
          url = this.privateUrl(path.basename(key));
        }
      } else {
        // Pour les images publiques
        url = cloudinary.url(key, { secure: true, resource_type: "image" });
      }
      
      this.logger.log(`Reading file from Cloudinary URL: ${key}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudinary fetch failed for ${key}: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());
      this.logger.log(`Successfully read ${buffer.length} bytes from ${key}`);
      return buffer;
    } catch (error) {
      this.logger.error(`Error reading from Cloudinary (${key}): ${error.message}`);
      throw new Error(`Cannot read file from Cloudinary: ${error.message}`);
    }
  }

  async delete(key: string): Promise<void> {
    await cloudinary.uploader.destroy(
      key,
      this.isDocument(key)
        ? { resource_type: "raw", type: "private", invalidate: true }
        : { resource_type: "image", invalidate: true },
    );
    this.logger.log(`Supprimé de Cloudinary : ${key}`);
  }

  private isDocument(key: string) {
    return key.startsWith(`${this.folder}/documents/`);
  }

  private send(buffer: Buffer, options: Record<string, unknown>) {
    return new Promise<{ public_id: string; secure_url: string; bytes: number }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(options, (error, res) => (error || !res ? reject(error) : resolve(res)))
        .end(buffer);
    });
  }
}
