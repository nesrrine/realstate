import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStudioDto, StudioTemplate, StudioFormat, StudioStatus, StudioPlatform } from "./dto/create-studio.dto";
import { UpdateStudioDto } from "./dto/update-studio.dto";
import { Role } from "../common/enums/role.enum";

const STUDIO_SELECT = {
  id: true,
  propertyId: true,
  title: true,
  template: true,
  format: true,
  imageUrls: true,
  descriptionFr: true,
  descriptionTn: true,
  descriptionIg: true,
  status: true,
  platform: true,
  shareUrl: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  property: {
    select: {
      id: true,
      reference: true,
      title: true,
      type: true,
      transactionType: true,
      status: true,
      address: true,
      city: true,
      surface: true,
      price: true,
      pricePerSqm: true,
      rooms: true,
      bedrooms: true,
      bathrooms: true,
      floor: true,
      elevator: true,
      balcony: true,
      garden: true,
      parking: true,
      titleType: true,
      description: true,
      images: {
        select: { id: true, url: true, altText: true, isCover: true, order: true },
        orderBy: [{ isCover: "desc" as const }, { order: "asc" as const }],
      },
      agent: { select: { id: true, user: { select: { firstName: true, lastName: true, phone: true, email: true } } } },
    },
  },
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
};

@Injectable()
export class StudioService {
  private readonly logger = new Logger(StudioService.name);

  constructor(private prisma: PrismaService) {}

  async create(dto: CreateStudioDto, userId: string, userRole: string) {
    // Tous les agents peuvent créer des affiches pour tous les biens
    void userRole;

    const data: any = {
      propertyId: dto.propertyId,
      template: dto.template,
      format: dto.format,
      title: dto.title,
      imageUrls: dto.imageUrls ?? [],
      descriptionFr: dto.descriptionFr,
      descriptionTn: dto.descriptionTn,
      descriptionIg: dto.descriptionIg,
      status: dto.status ?? "DRAFT",
      platform: dto.platform,
      shareUrl: dto.shareUrl,
      metadata: dto.metadata,
      createdById: userId,
    };

    return this.prisma.studioCreation.create({ data, select: STUDIO_SELECT });
  }

  async list(userId: string, userRole: string, filters?: { template?: string; propertyId?: string; status?: string }) {
    const where: any = {};
    if (filters?.propertyId) where.propertyId = filters.propertyId;
    if (filters?.template) where.template = filters.template;
    if (filters?.status) where.status = filters.status;

    // AGENT ne voit que ses créations
    if (userRole === Role.AGENT) where.createdById = userId;

    const [data, total] = await Promise.all([
      this.prisma.studioCreation.findMany({
        where,
        select: STUDIO_SELECT,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      this.prisma.studioCreation.count({ where }),
    ]);

    return { data, total };
  }

  async detail(id: string, userId: string, userRole: string) {
    const item = await this.prisma.studioCreation.findUnique({
      where: { id },
      select: STUDIO_SELECT,
    });
    if (!item) throw new NotFoundException(`StudioCreation ${id} not found`);
    if (userRole === Role.AGENT && item.createdBy.id !== userId) {
      throw new ForbiddenException("Accès interdit à cette création");
    }
    return item;
  }

  async update(id: string, dto: UpdateStudioDto, userId: string, userRole: string) {
    const item = await this.prisma.studioCreation.findUnique({
      where: { id },
      select: { createdById: true },
    });
    if (!item) throw new NotFoundException(`StudioCreation ${id} not found`);
    if (userRole === Role.AGENT && item.createdById !== userId) {
      throw new ForbiddenException("Vous ne pouvez modifier que vos propres créations");
    }

    const data: any = { ...dto, updatedAt: new Date() };
    return this.prisma.studioCreation.update({
      where: { id },
      data,
      select: STUDIO_SELECT,
    });
  }

  async remove(id: string, userId: string, userRole: string) {
    const item = await this.prisma.studioCreation.findUnique({
      where: { id },
      select: { createdById: true },
    });
    if (!item) throw new NotFoundException(`StudioCreation ${id} not found`);
    if (userRole === Role.AGENT && item.createdById !== userId) {
      throw new ForbiddenException("Vous ne pouvez supprimer que vos propres créations");
    }
    await this.prisma.studioCreation.delete({ where: { id } });
    return { message: `StudioCreation ${id} deleted` };
  }

  async stats(userId: string, userRole: string) {
    const where: any = {};
    if (userRole === Role.AGENT) where.createdById = userId;

    const [total, exported, shared] = await Promise.all([
      this.prisma.studioCreation.count({ where }),
      this.prisma.studioCreation.count({ where: { ...where, status: "EXPORTED" } }),
      this.prisma.studioCreation.count({ where: { ...where, status: "SHARED" } }),
    ]);

    return { total, exported, shared };
  }
}