export interface UploadedFile {
  url: string;         // public URL (relative « /uploads/... » en local : indépendante du domaine)
  key: string;         // storage identifier (path or Cloudinary public_id)
  size: number;        // bytes
  mimeType: string;
  originalName: string;
}

/** properties : photos publiques · documents : fichiers privés (liens signés, voir signed-url.ts) */
export type StorageFolder = "properties" | "documents";

export interface IStorageService {
  /**
   * Upload a single file buffer.
   * Returns metadata including the public URL.
   */
  upload(buffer: Buffer, originalName: string, mimeType: string, folder?: StorageFolder): Promise<UploadedFile>;

  /**
   * Delete a file by its storage key.
   */
  delete(key: string): Promise<void>;

  /**
   * Read a stored file (ZIP downloads), without going through its public URL.
   */
  read(key: string): Promise<Buffer>;

  /**
   * Document privé hébergé ailleurs (Cloudinary) : lien temporaire vers lequel rediriger
   * une fois la signature du backend vérifiée. Absent en local : fichier servi depuis le disque.
   */
  privateUrl?(fileName: string): string;
}

// Injection token
export const STORAGE_SERVICE = "STORAGE_SERVICE";
