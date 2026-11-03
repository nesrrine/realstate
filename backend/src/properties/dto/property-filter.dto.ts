import { IsOptional, IsEnum, IsNumber, IsString, Min, IsBoolean } from "class-validator";
import { Type, Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { PropertyType, PropertyStatus, TransactionType } from "@prisma/client";

export class PropertyFilterDto {
  // ── Pagination ──────────────────────────────────────────────────────
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  // ── Search ──────────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: "Search in reference, title, description, address, city" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Exact property reference (REF-2026-00001)" })
  @IsOptional()
  @IsString()
  reference?: string;

  // ── Filters ─────────────────────────────────────────────────────────
  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  type?: PropertyType;

  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  transactionType?: TransactionType;

  @ApiPropertyOptional({ enum: PropertyStatus })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  surfaceMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  surfaceMax?: number;

  @ApiPropertyOptional({ description: "Filter by agent ID" })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({ description: "Only published properties" })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  isPublished?: boolean;

  // ── Sort ────────────────────────────────────────────────────────────
  @ApiPropertyOptional({
    enum: ["price", "surface", "createdAt", "updatedAt", "title", "reference"],
    default: "createdAt",
  })
  @IsOptional()
  @IsString()
  sortBy?: string = "createdAt";

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsString()
  sortOrder?: "asc" | "desc" = "desc";
}
