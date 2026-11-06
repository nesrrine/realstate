import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Inject,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePropertyDto } from "./dto/create-property.dto";
import { UpdatePropertyDto } from "./dto/update-property.dto";
import { PropertyFilterDto } from "./dto/property-filter.dto";
import { CreatePropertyDocumentDto } from "./dto/create-property-document.dto";
import { Role } from "../common/enums/role.enum";
import { Prisma, VisitStatus } from "@prisma/client";
import { generatePropertyReference } from "./property-reference.util";
import { STORAGE_SERVICE, IStorageService } from "../storage/storage.interface";

const PROPERTY_SELECT = {
  id: true,
  reference: true,
  title: true,
  description: true,
  type: true,
  transactionType: true,
  status: true,
  address: true,
  city: true,
  district: true,
  zipCode: true,
  country: true,
  latitude: true,
  longitude: true,
  googleMapsUrl: true,
  surface: true,
  rooms: true,
  bedrooms: true,
  bathrooms: true,
  floor: true,
  totalFloors: true,
  parking: true,
  furnished: true,
  elevator: true,
  balcony: true,
  garden: true,
  cellar: true,
  titleType: true,
  commercialMonthlyRevenue: true,
  commercialLeased: true,
  commercialFrontage: true,
  commercialCeilingHeight: true,
  commercialMezzanine: true,
  landFrontage: true,
  landDepth: true,
  landCos: true,
  landCuf: true,
  landZoning: true,
  landServiced: true,
  landCorner: true,
  businessActivity: true,
  businessDailyRevenue: true,
  businessRent: true,
  businessEmployees: true,
  price: true,
  pricePerSqm: true,
  charges: true,
  deposit: true,
  notes: true,
  isPublished: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  agent: { select: { id: true, user: { select: { firstName: true, lastName: true, email: true, phone: true } } } },
  owner: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
  images: {
    select: { id: true, url: true, altText: true, isCover: true, order: true },
    orderBy: [{ isCover: "desc" as const }, { order: "asc" as const }],
  },
  documents: {
    select: { id: true, title: true, description: true, url: true, size: true, mimeType: true, originalName: true, category: true, createdAt: true },
    orderBy: { createdAt: "desc" as const },
  },
  // Visites réellement faites ou prévues (annulées et absences exclues)
  _count: {
    select: {
      visitProperties: { where: { visit: { status: { notIn: ["CANCELLED", "NO_SHOW"] as VisitStatus[] } } } },
    },
  },
};

// Site public (sans connexion) : jamais le propriétaire (nom, téléphone), ni les documents
// (titres, contrats), ni l'e-mail de l'agent.
const {
  owner: _owner,
  documents: _documents,
  _count: _visits,
  agent: _agent,
  ...PUBLIC_FIELDS
} = PROPERTY_SELECT;
const PUBLIC_PROPERTY_SELECT = {
  ...PUBLIC_FIELDS,
  agent: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
};
const isPublicRequest = (user: any) => user?.role === "PUBLIC";

// Les variables de catch sont de type `unknown` (strict) : on extrait message/stack en sécurité
const getErrorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const getErrorStack = (e: unknown): string | undefined => (e instanceof Error ? e.stack : undefined);

// Erreurs Prisma -> erreurs HTTP lisibles
const handlePrismaError = (e: unknown): never => {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      const target = e.meta?.target;
      const fields = Array.isArray(target) ? target.join(", ") : String(target ?? "");
      throw new ConflictException(`Valeur déjà utilisée : ${fields}`);
    }
    if (e.code === "P2003") {
      throw new BadRequestException("Référence invalide (propriétaire ou agent inexistant)");
    }
    if (e.code === "P2025") {
      throw new NotFoundException("Enregistrement lié introuvable (propriétaire ou agent)");
    }
  }
  throw e;
};

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);
  constructor(
    private prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private storage: IStorageService,
  ) {}

  // ── BUILD PRISMA WHERE ─────────────────────────────────────────────
  private buildWhere(filter: PropertyFilterDto, user: any): Prisma.PropertyWhereInput {
    const where: Prisma.PropertyWhereInput = {};

    // AGENT can see all properties (not just their own)
    if (filter.agentId) {
      where.agentId = filter.agentId;
    }

    if (filter.type)            where.type = filter.type;
    if (filter.transactionType) where.transactionType = filter.transactionType;
    if (filter.status)          where.status = filter.status;
    if (filter.city)            where.city = { contains: filter.city, mode: "insensitive" };
    if (filter.district)        where.district = { contains: filter.district, mode: "insensitive" };
    // Visiteur du site : uniquement les biens publiés, quel que soit le filtre demandé
    if (isPublicRequest(user)) where.isPublished = true;
    else if (filter.isPublished !== undefined) where.isPublished = filter.isPublished;

    if (filter.priceMin !== undefined || filter.priceMax !== undefined) {
      where.price = {};
      if (filter.priceMin !== undefined) (where.price as any).gte = filter.priceMin;
      if (filter.priceMax !== undefined) (where.price as any).lte = filter.priceMax;
    }

    if (filter.surfaceMin !== undefined || filter.surfaceMax !== undefined) {
      where.surface = {};
      if (filter.surfaceMin !== undefined) (where.surface as any).gte = filter.surfaceMin;
      if (filter.surfaceMax !== undefined) (where.surface as any).lte = filter.surfaceMax;
    }

    if (filter.search) {
      where.OR = [
        { reference:   { contains: filter.search, mode: "insensitive" } },
        { title:       { contains: filter.search, mode: "insensitive" } },
        { description: { contains: filter.search, mode: "insensitive" } },
        { address:     { contains: filter.search, mode: "insensitive" } },
        { city:        { contains: filter.search, mode: "insensitive" } },
      ];
    }

    if (filter.reference) {
      where.reference = { equals: filter.reference, mode: "insensitive" };
    }

    return where;
  }

  // ── GET AGENT ID FROM USER ────────────────────────────────────────
  private async getAgentId(userId: string): Promise<string> {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) throw new ForbiddenException("No agent profile found for this user");
    return agent.id;
  }

  // ── VÉRIFICATIONS D'EXISTENCE ─────────────────────────────────────
  private async assertOwnerExists(ownerId: string) {
    if (!ownerId) throw new BadRequestException("ownerId est requis");
    const owner = await this.prisma.owner.findUnique({
      where: { id: ownerId },
      select: { id: true },
    });
    if (!owner) throw new NotFoundException(`Propriétaire "${ownerId}" introuvable`);
  }

  private async assertAgentExists(agentId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true },
    });
    if (!agent) throw new NotFoundException(`Agent "${agentId}" introuvable`);
  }

  // ── FIND ALL ──────────────────────────────────────────────────────
  async findAll(filter: PropertyFilterDto, user: any) {
    const page  = filter.page  ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);
    const skip  = (page - 1) * limit;

    const allowedSort = ["price", "surface", "createdAt", "updatedAt", "title", "reference"];
    const sortBy    = allowedSort.includes(filter.sortBy) ? filter.sortBy : "createdAt";
    const sortOrder = filter.sortOrder === "asc" ? "asc" : "desc";

    const where = this.buildWhere(filter, user);

    const [total, data] = await this.prisma.$transaction([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        select: isPublicRequest(user) ? PUBLIC_PROPERTY_SELECT : PROPERTY_SELECT,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  // ── FIND ONE ──────────────────────────────────────────────────────
  async findOne(id: string, user: any) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      select: PROPERTY_SELECT,
    });

    if (!property) throw new NotFoundException(`Property ${id} not found`);

    return property;
  }

  // ── FIND ONE PUBLIC (only published) ──────────────────────────────
  async findOnePublic(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id, isPublished: true },
      select: PUBLIC_PROPERTY_SELECT,
    });

    if (!property) throw new NotFoundException(`Property ${id} not found`);

    return property;
  }

  // ── CREATE ────────────────────────────────────────────────────────
  async create(dto: CreatePropertyDto, user: any) {
    let agentId: string;

    if (user.role === Role.AGENT) {
      // Agent always creates for themselves
      agentId = await this.getAgentId(user.id);
    } else if (dto.agentId) {
      // ADMIN/MANAGER can assign to any agent
      await this.assertAgentExists(dto.agentId);
      agentId = dto.agentId;
    } else {
      // Default: the connected user's own agent profile
      agentId = await this.getAgentId(user.id);
    }

    // Le propriétaire doit exister (sinon 404 clair au lieu d'un 500)
    await this.assertOwnerExists(dto.ownerId);

    const pricePerSqm = dto.surface > 0
      ? Math.round((dto.price / dto.surface) * 100) / 100
      : null;

    const data: any = {
      title:           dto.title,
      description:     dto.description,
      type:            dto.type,
      transactionType: dto.transactionType,
      status:          dto.status ?? "DRAFT",
      address:         dto.address,
      city:            dto.city,
      district:        dto.district,
      zipCode:         dto.zipCode,
      country:         dto.country ?? "TN",
      latitude:        dto.latitude,
      longitude:       dto.longitude,
      googleMapsUrl:   dto.googleMapsUrl,
      surface:         dto.surface,
      rooms:           dto.rooms,
      bedrooms:        dto.bedrooms,
      bathrooms:       dto.bathrooms,
      floor:           dto.floor,
      totalFloors:     dto.totalFloors,
      parking:         dto.parking ?? false,
      furnished:       dto.furnished ?? false,
      elevator:        dto.elevator ?? false,
      balcony:         dto.balcony ?? false,
      garden:          dto.garden ?? false,
      cellar:          dto.cellar ?? false,
      titleType:       dto.titleType,
      commercialMonthlyRevenue: dto.commercialMonthlyRevenue,
      commercialLeased:         dto.commercialLeased ?? false,
      commercialFrontage:       dto.commercialFrontage,
      commercialCeilingHeight:  dto.commercialCeilingHeight,
      commercialMezzanine:      dto.commercialMezzanine ?? false,
      landFrontage:    dto.landFrontage,
      landDepth:       dto.landDepth,
      landCos:         dto.landCos,
      landCuf:         dto.landCuf,
      landZoning:      dto.landZoning,
      landServiced:    dto.landServiced ?? false,
      landCorner:      dto.landCorner ?? false,
      businessActivity:     dto.businessActivity,
      businessDailyRevenue: dto.businessDailyRevenue,
      businessRent:         dto.businessRent,
      businessEmployees:    dto.businessEmployees,
      price:           dto.price,
      pricePerSqm,
      charges:         dto.charges,
      deposit:         dto.deposit,
      notes:           dto.notes,
      isPublished:     dto.isPublished ?? false,
      publishedAt:     dto.isPublished ? new Date() : null,
      agent:  { connect: { id: agentId } },
      owner:  { connect: { id: dto.ownerId } },
    };

    if (dto.reference && dto.reference.trim() !== '') {
      const exists = await this.prisma.property.findUnique({
        where: { reference: dto.reference },
        select: { id: true },
      });
      if (exists) {
        throw new ConflictException(`Reference ${dto.reference} already exists`);
      }
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const reference = dto.reference && dto.reference.trim() !== ''
          ? dto.reference
          : (await generatePropertyReference(tx));
        return tx.property.create({
          data: { ...data, reference },
          select: PROPERTY_SELECT,
        });
      });
    } catch (e) {
      return handlePrismaError(e);
    }
  }

  // ── UPDATE ────────────────────────────────────────────────────────
  async update(id: string, dto: UpdatePropertyDto, user: any) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      select: { agentId: true, isPublished: true, agent: { select: { userId: true } } },
    });
    if (!property) throw new NotFoundException(`Property ${id} not found`);

    // AGENT can only update their own properties
    if (user.role === Role.AGENT && property.agent.userId !== user.id) {
      throw new ForbiddenException("You can only update your own properties");
    }

    const data: any = { ...dto };
    delete data.agentId; // prevent changing agent via update (use dedicated endpoint)
    delete data.ownerId;

    // Prevent updating reference to empty or invalid value
    if (data.reference !== undefined) {
      if (!data.reference || data.reference.trim() === '') {
        delete data.reference; // ignore empty reference in update
      } else if (!/^REF-\d{4}-\d{5}$/.test(data.reference)) {
        throw new BadRequestException('Format de référence invalide (ex: REF-2026-00042)');
      }
    }

    if (dto.ownerId) {
      await this.assertOwnerExists(dto.ownerId);
      data.owner = { connect: { id: dto.ownerId } };
    }

    if (dto.agentId && user.role !== Role.AGENT) {
      await this.assertAgentExists(dto.agentId);
      data.agent = { connect: { id: dto.agentId } };
    }

    if (dto.price !== undefined && dto.surface !== undefined && dto.surface > 0) {
      data.pricePerSqm = Math.round((dto.price / dto.surface) * 100) / 100;
    }

    // Handle publish date
    if (dto.isPublished === true && !property.isPublished) {
      data.publishedAt = new Date();
    } else if (dto.isPublished === false) {
      data.publishedAt = null;
    }

    try {
      return await this.prisma.property.update({
        where: { id },
        data,
        select: PROPERTY_SELECT,
      });
    } catch (e) {
      return handlePrismaError(e);
    }
  }

  // ── DELETE ────────────────────────────────────────────────────────
  async remove(id: string, user: any) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      select: { agent: { select: { userId: true } } },
    });
    if (!property) throw new NotFoundException(`Property ${id} not found`);

    // AGENT cannot delete
    if (user.role === Role.AGENT) {
      throw new ForbiddenException("Agents cannot delete properties");
    }

    try {
      await this.prisma.property.delete({ where: { id } });
    } catch (e) {
      return handlePrismaError(e);
    }
    return { message: `Property ${id} deleted successfully` };
  }

  // ── DOCUMENTS ───────────────────────────────────────────────────────

  async addDocument(
    propertyId: string,
    file: Express.Multer.File,
    dto: CreatePropertyDocumentDto,
    user: any,
  ) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, agentId: true, agent: { select: { userId: true } } },
    });
    if (!property) throw new NotFoundException(`Property ${propertyId} not found`);
    if (user.role === Role.AGENT && property.agent.userId !== user.id) {
      throw new ForbiddenException("You can only add documents to your own properties");
    }

    // Dossier privé : accessible seulement par lien signé (personnel connecté)
    const uploaded = await this.storage.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      "documents",
    );

    return this.prisma.propertyDocument.create({
      data: {
        propertyId,
        title: dto.title,
        description: dto.description,
        url: uploaded.url,
        storageKey: uploaded.key,
        size: uploaded.size,
        mimeType: uploaded.mimeType,
        originalName: uploaded.originalName,
        category: dto.category,
      },
    });
  }

  async removeDocument(propertyId: string, documentId: string, user: any) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, agentId: true, agent: { select: { userId: true } } },
    });
    if (!property) throw new NotFoundException(`Property ${propertyId} not found`);
    if (user.role === Role.AGENT && property.agent.userId !== user.id) {
      throw new ForbiddenException("You can only delete documents from your own properties");
    }

    const doc = await this.prisma.propertyDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException(`Document ${documentId} not found`);
    if (doc.propertyId !== propertyId) {
      throw new NotFoundException(`Document ${documentId} not found for property ${propertyId}`);
    }

    await this.storage.delete(doc.storageKey);
    await this.prisma.propertyDocument.delete({ where: { id: documentId } });
    return { message: `Document ${documentId} deleted` };
  }

  // ── DOWNLOAD SINGLE DOCUMENT ──────────────────────────────────────────
  async downloadDocument(propertyId: string, documentId: string, user: any): Promise<{ stream: Buffer; filename: string; contentType: string }> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, agentId: true, agent: { select: { userId: true } } },
    });
    if (!property) throw new NotFoundException(`Property ${propertyId} not found`);
    if (user.role === Role.AGENT && property.agent.userId !== user.id) {
      throw new ForbiddenException("You can only download documents from your own properties");
    }

    const doc = await this.prisma.propertyDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException(`Document ${documentId} not found`);
    if (doc.propertyId !== propertyId) {
      throw new NotFoundException(`Document ${documentId} not found for property ${propertyId}`);
    }

    this.logger.log(`Downloading document ${documentId} (${doc.originalName}) from property ${propertyId}`);
    this.logger.log(`Storage key: ${doc.storageKey}, MIME type: ${doc.mimeType}`);

    try {
      // Fetch from storage (Cloudinary or local)
      const buffer = await this.storage.read(doc.storageKey);

      this.logger.log(`Successfully retrieved ${buffer.length} bytes for document ${documentId}`);

      return {
        stream: buffer,
        filename: doc.originalName || `document-${doc.id}`,
        contentType: doc.mimeType || 'application/octet-stream',
      };
    } catch (error) {
      this.logger.error(`Error downloading document ${documentId} from storage:`, {
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        storageKey: doc.storageKey,
        documentId: doc.id,
        propertyId,
      });
      throw new NotFoundException(`Failed to download document: ${getErrorMessage(error)}`);
    }
  }

  // ── ZIP HELPER (compatible archiver v7 et v8) ───────────────────────
  private createZipArchive(): any {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("archiver");
    const options = { zlib: { level: 9 } };

    if (typeof mod === "function") return mod("zip", options);               // v7 et avant
    if (mod?.ZipArchive) return new mod.ZipArchive(options);                 // v8
    if (typeof mod?.default === "function") return mod.default("zip", options);
    if (mod?.default?.ZipArchive) return new mod.default.ZipArchive(options);

    throw new Error(
      `Module archiver incompatible (type: ${typeof mod}, clés: ${Object.keys(mod ?? {}).join(", ")})`,
    );
  }

  // ── DOWNLOAD DOCUMENTS ZIP ──────────────────────────────────────────
  async downloadDocumentsZip(propertyId: string, user: any): Promise<Buffer> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, agentId: true, agent: { select: { userId: true } } },
    });
    if (!property) throw new NotFoundException(`Property ${propertyId} not found`);
    if (user.role === Role.AGENT && property.agent.userId !== user.id) {
      throw new ForbiddenException("You can only download documents from your own properties");
    }

    const documents = await this.prisma.propertyDocument.findMany({
      where: { propertyId },
      orderBy: { createdAt: "desc" as const },
    });
    if (!documents || documents.length === 0) {
      throw new NotFoundException(`No documents found for property ${propertyId}`);
    }

    // 1) Lire tous les fichiers AVANT de créer l'archive
    const files = await Promise.all(
      documents.map(async (doc, index) => {
        let buffer: Buffer;
        try {
          buffer = await this.storage.read(doc.storageKey);
        } catch (readError) {
          const reason = getErrorMessage(readError);
          this.logger.error(`Cannot read document ${doc.id} (${doc.storageKey}): ${reason}`);
          // Ajouter un fichier texte d'erreur au lieu de tout faire échouer
          buffer = Buffer.from(
            `Erreur: Impossible de récupérer le document "${doc.originalName || doc.title}"\n${reason}`,
            "utf-8",
          );
        }
        const baseName = doc.originalName || `document-${doc.id}.txt`;
        const name = `${String(index + 1).padStart(3, "0")}-${baseName}`;
        return { buffer, name };
      }),
    );

    // 2) Construire le ZIP
    return new Promise<Buffer>((resolve, reject) => {
      let archive: any;
      try {
        archive = this.createZipArchive();
      } catch (err) {
        this.logger.error(`Cannot create ZIP archive: ${getErrorMessage(err)}`);
        return reject(err);
      }

      const chunks: Buffer[] = [];

      archive.on("data", (chunk: Buffer) => chunks.push(chunk));
      archive.on("end", () => resolve(Buffer.concat(chunks)));
      archive.on("error", (err: Error) => reject(err));
      archive.on("warning", (err: Error) => this.logger.warn(`ZIP warning: ${err.message}`));

      for (const file of files) {
        archive.append(file.buffer, { name: file.name });
      }

      this.logger.log(`Finalizing ZIP with ${files.length} documents`);
      Promise.resolve(archive.finalize()).catch(reject);
    });
  }

  // ── DOWNLOAD IMAGES ZIP ─────────────────────────────────────────────
  async downloadImagesZip(propertyId: string, user: any): Promise<Buffer> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        agent: { select: { userId: true } },
        images: {
          select: { id: true, url: true },
          orderBy: [{ isCover: "desc" as const }, { order: "asc" as const }],
        },
      },
    });
    if (!property) throw new NotFoundException(`Property ${propertyId} not found`);
    if (user.role === Role.AGENT && property.agent.userId !== user.id) {
      throw new ForbiddenException("You can only download images from your own properties");
    }
    if (!property.images || property.images.length === 0) {
      throw new NotFoundException(`No images found for property ${propertyId}`);
    }

    // 1) Télécharger toutes les images AVANT de créer l'archive
    const files = await Promise.all(
      property.images.map(async (img, index) => {
        const num = String(index + 1).padStart(3, "0");
        try {
          const response = await fetch(img.url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const buffer = Buffer.from(await response.arrayBuffer());

          const pathname = new URL(img.url).pathname;
          const dot = pathname.lastIndexOf(".");
          const ext = dot > pathname.lastIndexOf("/") ? pathname.slice(dot) : ".jpg";

          return { buffer, name: `image-${num}${ext}` };
        } catch (e) {
          const reason = getErrorMessage(e);
          this.logger.error(`Cannot fetch image ${img.id} (${img.url}): ${reason}`);
          // Fichier texte d'erreur au lieu de faire échouer tout le ZIP
          return {
            buffer: Buffer.from(`Erreur: impossible de récupérer l'image ${img.url}\n${reason}`, "utf-8"),
            name: `image-${num}-erreur.txt`,
          };
        }
      }),
    );

    // 2) Construire le ZIP
    return new Promise<Buffer>((resolve, reject) => {
      let archive: any;
      try {
        archive = this.createZipArchive();
      } catch (err) {
        this.logger.error(`Cannot create ZIP archive: ${getErrorMessage(err)}`);
        return reject(err);
      }

      const chunks: Buffer[] = [];

      archive.on("data", (chunk: Buffer) => chunks.push(chunk));
      archive.on("end", () => resolve(Buffer.concat(chunks)));
      archive.on("error", (err: Error) => reject(err));
      archive.on("warning", (err: Error) => this.logger.warn(`ZIP warning: ${err.message}`));

      for (const file of files) {
        archive.append(file.buffer, { name: file.name });
      }

      this.logger.log(`Finalizing ZIP with ${files.length} images`);
      Promise.resolve(archive.finalize()).catch(reject);
    });
  }
}