import {
  IsString, IsNotEmpty, IsOptional, IsEmail, MaxLength,
  IsArray, IsNumber, Min, IsEnum, IsInt, IsIn,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionType, PropertyType, ContactStatus, FollowUpStatus } from "@prisma/client";

export enum ClientType {
  BUYER = "BUYER",
  SELLER = "SELLER",
  RENTER = "RENTER",
}

export class CreateClientDto {
  // ── Identity ──────────────────────────────────────────────────
  @ApiProperty({ example: "Marie" })
  @IsString() @IsNotEmpty() @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: "Dupont" })
  @IsString() @IsNotEmpty() @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: "+33612345678" })
  @IsString() @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: "+33612345678", description: "WhatsApp number" })
  @IsOptional() @IsString()
  whatsapp?: string;

  @ApiProperty({ example: "1234567890123", description: "CNI ou numéro de passeport" })
  @IsString() @IsNotEmpty()
  cinOrPassport: string;

  @ApiProperty({ example: "marie@example.com" })
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    enum: ClientType,
    example: ClientType.BUYER,
    description: "BUYER, SELLER or RENTER",
  })
  @IsOptional() @IsEnum(ClientType)
  clientType?: ClientType;

  // ── Address ───────────────────────────────────────────────────
  @ApiPropertyOptional({ example: "12 rue de la Paix" })
  @IsOptional() @IsString()
  address?: string;

  @ApiPropertyOptional({ example: "Paris" })
  @IsOptional() @IsString()
  city?: string;

  @ApiPropertyOptional({ example: "75001" })
  @IsOptional() @IsString()
  zipCode?: string;

  @ApiProperty({ example: "10 avenue des Champs-Élysées, 75008 Paris", description: "Adresse professionnelle" })
  @IsString() @IsNotEmpty()
  professionalAddress: string;

  // ── Search criteria ───────────────────────────────────────────
  @ApiPropertyOptional({ example: 200000, description: "Budget min (DT)" })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  budgetMin?: number;

  @ApiPropertyOptional({ example: 500000, description: "Budget max (DT)" })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  budgetMax?: number;

  @ApiPropertyOptional({
    example: ["Paris 11e", "Paris 12e"],
    description: "Preferred zones/districts",
    type: [String],
  })
  @IsOptional() @IsArray() @IsString({ each: true })
  preferredZones?: string[];

  @ApiPropertyOptional({
    enum: PropertyType,
    isArray: true,
    example: ["APARTMENT", "HOUSE"],
    description: "Preferred property types",
  })
  @IsOptional() @IsArray() @IsEnum(PropertyType, { each: true })
  preferredPropertyTypes?: PropertyType[];

  @ApiPropertyOptional({ example: 50, description: "Minimum surface in m2" })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  minSurface?: number;

  @ApiPropertyOptional({ example: 2, description: "Number of bedrooms" })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({ enum: TransactionType, description: "SALE or RENTAL" })
  @IsOptional() @IsEnum(TransactionType)
  transactionType?: TransactionType;

  @ApiPropertyOptional({ enum: ["CASH", "CREDIT", "MIXED"], description: "Mode de paiement : comptant, crédit ou les deux" })
  @IsOptional() @IsIn(["CASH", "CREDIT", "MIXED"])
  financing?: string;

  @ApiPropertyOptional({ example: "Terrain 300 m² zone villa, proche de l'école", description: "Besoin exact du client" })
  @IsOptional() @IsString() @MaxLength(2000)
  needDescription?: string;

  @ApiPropertyOptional({ description: "Agent terrain qui fait les visites" })
  @IsOptional() @IsString()
  fieldAgentId?: string;

  // ── Meta ──────────────────────────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "Assign to specific agent (ADMIN/MANAGER only)" })
  @IsOptional() @IsString()
  agentId?: string;

  @ApiPropertyOptional({ enum: ContactStatus, default: "PROSPECT", description: "PROSPECT or CLIENT" })
  @IsOptional() @IsEnum(ContactStatus)
  status?: ContactStatus;

  // Suivi commercial
  @ApiPropertyOptional({ enum: FollowUpStatus, default: "TO_CONTACT", description: "Statut de suivi commercial" })
  @IsOptional() @IsEnum(FollowUpStatus)
  followUpStatus?: FollowUpStatus;

  @ApiPropertyOptional({ description: "Date de dernière interaction" })
  @IsOptional()
  lastInteractionAt?: Date;

  @ApiPropertyOptional({ description: "Date de prochaine relance" })
  @IsOptional()
  nextFollowUpAt?: Date;
}