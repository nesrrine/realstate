import {
  Injectable, NotFoundException, ForbiddenException, ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOwnerDto } from "./dto/create-owner.dto";
import { UpdateOwnerDto } from "./dto/update-owner.dto";
import { OwnerFilterDto } from "./dto/owner-filter.dto";
import { Role } from "../common/enums/role.enum";

const OWNER_SELECT = {
  id: true, firstName: true, lastName: true, email: true,
  phone: true, whatsapp: true, address: true, city: true,
  zipCode: true, country: true, notes: true, isActive: true,
  createdAt: true, updatedAt: true,
};

@Injectable()
export class OwnersService {
  constructor(private prisma: PrismaService) {}

  // ── FIND ALL ────────────────────────────────────────────────────
  async findAll(filter: OwnerFilterDto, user: any) {
    // AGENT can see owners (for property creation dropdown)
    if (user.role === Role.AGENT) {
      // Optionally filter to owners linked to agent's properties
      // For now, allow all owners since they can create new ones
    }

    const page  = filter.page  ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);
    const skip  = (page - 1) * limit;
    const where: any = {};

    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.city) where.city = { contains: filter.city, mode: "insensitive" };
    if (filter.search) {
      where.OR = [
        { firstName: { contains: filter.search, mode: "insensitive" } },
        { lastName:  { contains: filter.search, mode: "insensitive" } },
        { email:     { contains: filter.search, mode: "insensitive" } },
        { phone:     { contains: filter.search, mode: "insensitive" } },
        { city:      { contains: filter.search, mode: "insensitive" } },
      ];
    }

    const allowed = ["createdAt", "lastName", "firstName"];
    const sortBy    = allowed.includes(filter.sortBy) ? filter.sortBy : "createdAt";
    const sortOrder = filter.sortOrder === "asc" ? "asc" : "desc";

    const [total, data] = await this.prisma.$transaction([
      this.prisma.owner.count({ where }),
      this.prisma.owner.findMany({
        where, select: { ...OWNER_SELECT, _count: { select: { properties: true } } },
        orderBy: { [sortBy]: sortOrder },
        skip, take: limit,
      }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ── FIND ONE ────────────────────────────────────────────────────
  async findOne(id: string, user: any) {
    const owner = await this.prisma.owner.findUnique({
      where: { id },
      select: {
        ...OWNER_SELECT,
        properties: {
          select: { id: true, title: true, city: true, type: true,
                    status: true, price: true, surface: true, isPublished: true },
          orderBy: { createdAt: "desc" },
        },
        transactions: {
          select: { id: true, type: true, amount: true, date: true, status: true,
                    property: { select: { title: true, city: true } } },
          orderBy: { createdAt: "desc" }, take: 10,
        },
      },
    });

    if (!owner) throw new NotFoundException(`Owner ${id} not found`);
    return owner;
  }

  // ── CREATE ──────────────────────────────────────────────────────
  async create(dto: CreateOwnerDto, user: any) {
    if (dto.email) {
      const exists = await this.prisma.owner.findUnique({ where: { email: dto.email } });
      if (exists) throw new ConflictException(`Email ${dto.email} already registered`);
    }

    return this.prisma.owner.create({
      data: {
        firstName: dto.firstName, lastName: dto.lastName,
        phone: dto.phone, whatsapp: dto.whatsapp, email: dto.email,
        address: dto.address, city: dto.city, zipCode: dto.zipCode,
        country: dto.country ?? "TN", notes: dto.notes,
      },
      select: OWNER_SELECT,
    });
  }

  // ── UPDATE ──────────────────────────────────────────────────────
  async update(id: string, dto: UpdateOwnerDto, user: any) {
    if (user.role === Role.AGENT)
      throw new ForbiddenException("Agents cannot update owners");
    const owner = await this.prisma.owner.findUnique({ where: { id } });
    if (!owner) throw new NotFoundException(`Owner ${id} not found`);
    return this.prisma.owner.update({ where: { id }, data: dto, select: OWNER_SELECT });
  }

  // ── REMOVE (soft delete) ────────────────────────────────────────
  async remove(id: string, user: any) {
    if (user.role !== Role.ADMIN)
      throw new ForbiddenException("Only ADMIN can delete owners");
    const owner = await this.prisma.owner.findUnique({ where: { id } });
    if (!owner) throw new NotFoundException(`Owner ${id} not found`);

    // Check no active properties
    const activeProps = await this.prisma.property.count({
      where: { ownerId: id, status: { notIn: ["SOLD", "ARCHIVED"] } },
    });
    if (activeProps > 0)
      throw new ForbiddenException(`Cannot deactivate owner with ${activeProps} active properties`);

    await this.prisma.owner.update({ where: { id }, data: { isActive: false } });
    return { message: `Owner ${id} deactivated successfully` };
  }
}
