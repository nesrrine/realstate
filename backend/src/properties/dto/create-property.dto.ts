import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  MaxLength,
  Matches,
  IsIn,
  IsInt,
} from "class-validator";
import { Type } from "class-transformer";

export const TITLE_TYPES = ["INDIVIDUAL", "COLLECTIVE", "IN_PROGRESS", "NONE"];
export const LAND_ZONINGS =["RESIDENTIAL", "AGRICULTURAL", "INDUSTRIAL", "TOURISTIC", "MIXED"];
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PropertyType, PropertyStatus, TransactionType } from "@prisma/client";

export class CreatePropertyDto {
  @ApiPropertyOptional({
    example: "REF-2026-00042",
    description: "Référence agence (générée automatiquement si omise)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^REF-\d{4}-\d{5}$/, { message: 'La référence doit être au format REF-YYYY-NNNNN' })
  reference?: string;

  @ApiProperty({ example: "Beau T3 lumineux - Paris 11e" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: "Superbe appartement..." })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: PropertyType, example: PropertyType.APARTMENT })
  @IsEnum(PropertyType)
  type: PropertyType;

  @ApiProperty({ enum: TransactionType, example: TransactionType.SALE })
  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @ApiPropertyOptional({ enum: PropertyStatus, default: PropertyStatus.DRAFT })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  // ── Address ─────────────────────────────────────────────────────────
  @ApiProperty({ example: "12 rue de la Paix" })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: "Paris" })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ example: "11e arrondissement" })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ example: "75011" })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional({ example: "TN" })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 48.8566 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 2.3522 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: "https://maps.google.com/?q=48.8566,2.3522" })
  @IsOptional()
  @IsString()
  googleMapsUrl?: string;

  // ── Characteristics ─────────────────────────────────────────────────
  @ApiProperty({ example: 65.5, description: "Surface in m2" })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  surface: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rooms?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bedrooms?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bathrooms?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  floor?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalFloors?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  parking?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  furnished?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  elevator?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  balcony?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  garden?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  cellar?: boolean;

  // ── Titre de propriété ──────────────────────────────────────────────
  @ApiPropertyOptional({ enum: TITLE_TYPES, example: "INDIVIDUAL" })
  @IsOptional()
  @IsIn(TITLE_TYPES)
  titleType?: string;

  // ── Local commercial ────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 2500, description: "Revenu par mois" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  commercialMonthlyRevenue?: number;

  @ApiPropertyOptional({ example: true, description: "Actuellement loué" })
  @IsOptional()
  @IsBoolean()
  commercialLeased?: boolean;

  @ApiPropertyOptional({ example: 8, description: "Façade vitrine (m)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  commercialFrontage?: number;

  @ApiPropertyOptional({ example: 3.5, description: "Hauteur sous plafond (m)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  commercialCeilingHeight?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  commercialMezzanine?: boolean;

  // ── Terrain ─────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 20, description: "Façade (m)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  landFrontage?: number;

  @ApiPropertyOptional({ example: 25, description: "Profondeur (m)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  landDepth?: number;

  @ApiPropertyOptional({ example: 0.4, description: "Coefficient d'occupation du sol" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  landCos?: number;

  @ApiPropertyOptional({ example: 1.2, description: "Coefficient d'utilisation foncière" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  landCuf?: number;

  @ApiPropertyOptional({ enum: LAND_ZONINGS, example: "RESIDENTIAL" })
  @IsOptional()
  @IsIn(LAND_ZONINGS)
  landZoning?: string;

  @ApiPropertyOptional({ example: true, description: "Viabilisé (eau, électricité)" })
  @IsOptional()
  @IsBoolean()
  landServiced?: boolean;

  @ApiPropertyOptional({ example: false, description: "Terrain d'angle" })
  @IsOptional()
  @IsBoolean()
  landCorner?: boolean;

  // ── Fonds de commerce ───────────────────────────────────────────────
  @ApiPropertyOptional({ example: "Café", description: "Activité exercée" })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  businessActivity?: string;

  @ApiPropertyOptional({ example: 800, description: "Recette moyenne par jour" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  businessDailyRevenue?: number;

  @ApiPropertyOptional({ example: 1200, description: "Loyer mensuel du local" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  businessRent?: number;

  @ApiPropertyOptional({ example: 3, description: "Nombre d'employés" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  businessEmployees?: number;

  // ── Pricing ─────────────────────────────────────────────────────────
  @ApiProperty({ example: 350000, description: "Prix en DT" })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  charges?: number;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  deposit?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  // ── Note interne ─────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: "Client très exigeant, bien à mettre en avant la cuisine." })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  // ── Relations ───────────────────────────────────────────────────────
  @ApiProperty({ description: "Owner ID" })
  @IsString()
  @IsNotEmpty()
  ownerId: string;

  @ApiPropertyOptional({ description: "Agent ID (ADMIN/MANAGER can assign)" })
  @IsOptional()
  @IsString()
  agentId?: string;
}