import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { IStorageService, StorageFolder, UploadedFile } from "./storage.interface";

/**
 * LocalStorageService
 * Stores files on the local filesystem under /uploads.
 * Replace with CloudinaryStorageService for production.
 *
 * To switch to Cloudinary:
 * 1. Create CloudinaryStorageService implementing IStorageService
 * 2. In StorageModule, change the provider to use CloudinaryStorageService
 * 3. Set STORAGE_DRIVER=cloudinary in .env
 */
@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;

  constructor(private config: ConfigService) {
    this.uploadDir = this.config.get<string>("UPLOAD_DIR", "./uploads");
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  async upload(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder: StorageFolder = "properties",
  ): Promise<UploadedFile> {
    const ext      = path.extname(originalName).toLowerCase() || ".jpg";
    const key      = `${folder}/${uuidv4()}${ext}`;
    const filePath = path.join(this.uploadDir, key);

    // Ensure sub-directory exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);

    // Adresse relative : le site la sert via /uploads (proxy Next.js), quel que soit le domaine
    const url = `/uploads/${key}`;
    this.logger.log(`Uploaded: ${key} (${buffer.length} bytes)`);

    return {
      url,
      key,
      size: buffer.length,
      mimeType,
      originalName,
    };
  }

  async read(key: string): Promise<Buffer> {
    // Refuse toute clé qui sortirait du dossier d'upload (../)
    const filePath = path.resolve(this.uploadDir, key);
    if (!filePath.startsWith(path.resolve(this.uploadDir) + path.sep)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return fs.promises.readFile(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.log(`Deleted: ${key}`);
    }
  }
}
