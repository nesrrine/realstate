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

    const { ZipArchive } = await import('archiver');

    return new Promise((resolve, reject) => {
      const archive = new ZipArchive({ zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', (err: Error) => reject(err));

      const promises = documents.map(async (doc, index) => {
        try {
          // Lecture directe du stockage (l'URL publique est relative au site)
          const buffer = await this.storage.read(doc.storageKey);

          const ext = doc.originalName?.split('.').pop() || 'bin';
          const filename = `${String(index + 1).padStart(3, '0')}-${doc.originalName || `document-${doc.id}.${ext}`}`;

          archive.append(buffer, { name: filename });
        } catch (error) {
          this.logger.error(`Error adding document ${doc.id} to zip: ${error.message}`);
        }
      });

      Promise.all(promises)
        .then(() => archive.finalize())
        .catch((err) => reject(err));
    });
  }
}