
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsDateString,
  IsBoolean,
  IsDefined,
} from "class-validator";

import { Type } from "class-transformer";

import {
  ApiProperty,
  ApiPropertyOptional,
} from "@nestjs/swagger";

import {
  TransactionType,
  TransactionStatus,
} from "@prisma/client";

export class CreateTransactionDto {
  @ApiProperty({ description: "Bien immobilier" })
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({ description: "Client acheteur / locataire" })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({ description: "Propriétaire du bien" })
  @IsString()
  @IsNotEmpty()
  ownerId: string;

  @ApiProperty({ description: "Agent terrain" })
  @IsString()
  @IsNotEmpty()
  fieldAgentId: string;

  @ApiProperty({ description: "Agent bureau" })
  @IsString()
  @IsNotEmpty()
  officeAgentId: string;

  @ApiProperty({
    enum: TransactionType,
    description: "Type de transaction (vente / location)",
  })
  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @ApiProperty({
    example: 250000,
    description: "Montant de la transaction en DT",
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({
    description: "Date de la transaction (ISO 8601)",
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  // Taux personnalisables pour cette transaction.
  // Si non fournis, les paramètres globaux sont utilisés.

  @ApiPropertyOptional({
    example: 0.02,
    description: "Commission acheteur (2 % = 0.02)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  buyerCommissionRate?: number;

  @ApiPropertyOptional({
    example: 0.02,
    description: "Commission vendeur (2 % = 0.02)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  sellerCommissionRate?: number;

  @ApiPropertyOptional({
    example: 0.30,
    description: "Part agent terrain (30 % = 0.30)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  fieldAgentShareRate?: number;

  @ApiPropertyOptional({
    example: 0.20,
    description: "Part agent bureau (20 % = 0.20)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  officeAgentShareRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    default: true,
    description: "Créer automatiquement la commission",
  })
  @IsOptional()
  @IsBoolean()
  createCommission?: boolean;
}
