import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { IStorageService, STORAGE_SERVICE, UploadedFile } from "../storage/storage.interface";
import { Role } from "../common/enums/role.enum";
import { ReorderImagesDto } from "./dto/reorder-images.dto";
import { UpdateImageDto } from "./dto/update-image.dto";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGES_PER_PROPERTY = 20;

// Couverture d'abord, puis par ordre
const IMAGE_ORDER: Prisma.PropertyImageOrderByWithRelationInput[] = [
  { isCover: "desc" },
  { order: "asc" },
];

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private storage: IStorageService,
  ) {}

  // ── GUARD ─────────────────────────────────────────────────────────
  private async assertAccess(propertyId: string, user: any): Promise<void> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { agent: { select: { userId: true } } },
    });
    if (!property) throw new NotFoundException(`Property ${propertyId} not found`);

    if (user.role === Role.AGENT && property.agent?.userId !== user.id) {
      throw new ForbiddenException("You can only manage images of your own properties");
    }
  }

  // Supprime du storage des fichiers déjà envoyés (rollback)
  private async cleanup(items: UploadedFile[]) {
    await Promise.all(
      items.map((u) =>
        this.storage
          .delete(u.key)
          .catch((e) => this.logger.warn(`Cleanup failed for ${u.key}: ${e?.message}`)),
      ),
    );
  }

  private list(propertyId: string) {
    return this.prisma.propertyImage.findMany({
      where: { propertyId },
      orderBy: IMAGE_ORDER,
    });
  }

  // ── LIST ──────────────────────────────────────────────────────────
  async findAll(propertyId: string, user: any) {
    await this.assertAccess(propertyId, user);
    return this.list(propertyId);
  }

  // ── UPLOAD ────────────────────────────────────────────────────────
  async uploadMany(propertyId: string, files: Express.Multer.File[], user: any) {
    await this.assertAccess(propertyId, user);

    if (!files || files.length === 0) {
      throw new BadRequestException("No files provided");
    }

    // 1. Tout valider AVANT d'envoyer quoi que ce soit
    for (const file of files) {
      if (!ALLOWED_MIME.includes(file.mimetype)) {
        throw new BadRequestException(
          `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME.join(", ")}`,
        );
      }
      if (file.size > MAX_SIZE_BYTES) {
        throw new BadRequestException(`File too large: ${file.originalname}. Max size: 10MB`);
      }
    }

    const existing = await this.prisma.propertyImage.count({ where: { propertyId } });
    if (existing + files.length > MAX_IMAGES_PER_PROPERTY) {
      throw new BadRequestException(
        `Max ${MAX_IMAGES_PER_PROPERTY} images per property. Current: ${existing}`,
      );
    }

    // 2. Envoi au storage (local ou Cloudinary)
    const uploaded: UploadedFile[] = [];
    try {
      for (const file of files) {
        uploaded.push(await this.storage.upload(file.buffer, file.originalname, file.mimetype));
      }
    } catch (e) {
      await this.cleanup(uploaded);
      throw e;
    }

    // 3. Enregistrement en base, en une seule transaction
    try {
      return await this.prisma.$transaction(async (tx) => {
        const agg = await tx.propertyImage.aggregate({
          where: { propertyId },
          _max: { order: true },
        });
        const cover = await tx.propertyImage.findFirst({
          where: { propertyId, isCover: true },
          select: { id: true },
        });

        let order = (agg._max.order ?? -1) + 1;
        let needsCover = !cover; // la 1re photo devient la principale

        const created = [];
        for (const u of uploaded) {
          created.push(
            await tx.propertyImage.create({
              data: {
                propertyId,
                url: u.url,
                storageKey: u.key,
                altText: null,
                isCover: needsCover,
                order: order++,
                size: u.size,
                mimeType: u.mimeType,
                originalName: u.originalName,
              },
            }),
          );
          needsCover = false;
        }
        return created;
      });
    } catch (e) {
      await this.cleanup(uploaded);
      throw e;
    }
  }

  // ── UPDATE metadata ───────────────────────────────────────────────
  async update(propertyId: string, imageId: string, dto: UpdateImageDto, user: any) {
    await this.assertAccess(propertyId, user);

    const image = await this.prisma.propertyImage.findFirst({
      where: { id: imageId, propertyId },
    });
    if (!image) throw new NotFoundException(`Image ${imageId} not found`);

    // On ne peut pas "retirer" la couverture : il faut en choisir une autre
    const isCover = dto.isCover === false && image.isCover ? undefined : dto.isCover;

    return this.prisma.$transaction(async (tx) => {
      if (isCover === true) {
        await tx.propertyImage.updateMany({
          where: { propertyId, isCover: true },
          data: { isCover: false },
        });
      }
      return tx.propertyImage.update({
        where: { id: imageId },
        data: { altText: dto.altText, isCover, order: dto.order },
      });
    });
  }

  // ── SET COVER ─────────────────────────────────────────────────────
  async setCover(propertyId: string, imageId: string, user: any) {
    await this.assertAccess(propertyId, user);

    const image = await this.prisma.propertyImage.findFirst({
      where: { id: imageId, propertyId },
    });
    if (!image) throw new NotFoundException(`Image ${imageId} not found`);

    await this.prisma.$transaction([
      this.prisma.propertyImage.updateMany({
        where: { propertyId },
        data: { isCover: false },
      }),
      this.prisma.propertyImage.update({
        where: { id: imageId },
        data: { isCover: true },
      }),
    ]);

    return this.list(propertyId);
  }

  // ── REORDER ───────────────────────────────────────────────────────
  async reorder(propertyId: string, dto: ReorderImagesDto, user: any) {
    await this.assertAccess(propertyId, user);

    const existing = await this.prisma.propertyImage.findMany({
      where: { propertyId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((i) => i.id));
    const ids = dto.imageIds;

    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException("Duplicate image IDs");
    }
    if (ids.length !== existing.length || ids.some((id) => !existingIds.has(id))) {
      throw new BadRequestException(
        "imageIds must contain exactly all the images of this property",
      );
    }

    // Le 1er devient la couverture
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.propertyImage.update({
          where: { id },
          data: { order: index, isCover: index === 0 },
        }),
      ),
    );

    return this.list(propertyId);
  }

  // ── DELETE ────────────────────────────────────────────────────────
  async remove(propertyId: string, imageId: string, user: any) {
    await this.assertAccess(propertyId, user);

    const image = await this.prisma.propertyImage.findFirst({
      where: { id: imageId, propertyId },
    });
    if (!image) throw new NotFoundException(`Image ${imageId} not found`);

    // Base d'abord, storage ensuite (si le storage échoue, on log seulement)
    await this.prisma.propertyImage.delete({ where: { id: imageId } });

    if (image.isCover) {
      const next = await this.prisma.propertyImage.findFirst({
        where: { propertyId },
        orderBy: { order: "asc" },
      });
      if (next) {
        await this.prisma.propertyImage.update({
          where: { id: next.id },
          data: { isCover: true },
        });
      }
    }

    if (image.storageKey) {
      await this.storage
        .delete(image.storageKey)
        .catch((e) => this.logger.warn(`Storage delete failed for ${image.storageKey}: ${e?.message}`));
    }

    return { message: `Image ${imageId} deleted successfully` };
  }

  // ── DOWNLOAD ZIP ──────────────────────────────────────────────────
  async downloadZip(propertyId: string, user: any): Promise<Buffer> {
    await this.assertAccess(propertyId, user);

    const images = await this.list(propertyId);
    if (!images || images.length === 0) {
      throw new NotFoundException(`No images found for property ${propertyId}`);
    }

    // Import dynamique d'archiver (ES module)
    const { ZipArchive } = await import('archiver');

    return new Promise((resolve, reject) => {
      // Créer l'archive ZIP
      const archive = new ZipArchive({ zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', (err: Error) => reject(err));

      // Télécharger chaque image et l'ajouter au ZIP
      const promises = images.map(async (img, index) => {
        try {
          if (!img.storageKey) {
            this.logger.warn(`Image ${img.id} has no storage key`);
            return;
          }
          // Lecture directe du stockage (l'URL publique est relative au site)
          const buffer = await this.storage.read(img.storageKey);
          
          // Nom de fichier: 001-image.jpg, 002-image.jpg, etc.
          const ext = img.originalName?.split('.').pop() || 'jpg';
          const filename = `${String(index + 1).padStart(3, '0')}-${img.originalName || `image-${img.id}.${ext}`}`;
          
          archive.append(buffer, { name: filename });
        } catch (error) {
          this.logger.error(`Error adding image ${img.id} to zip: ${error.message}`);
        }
      });

      Promise.all(promises)
        .then(() => archive.finalize())
        .catch((err) => reject(err));
    });
  }
}