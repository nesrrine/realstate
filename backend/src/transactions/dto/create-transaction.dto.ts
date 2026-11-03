import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsDateString,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionType, TransactionStatus } from "@prisma/client";

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

  @ApiProperty({ description: "Agent terrain (obligatoire)" })
  @IsString()
  @IsNotEmpty()
  fieldAgentId: string;

  @ApiProperty({ description: "Agent bureau (obligatoire)" })
  @IsString()
  @IsNotEmpty()
  officeAgentId: string;

  @ApiProperty({ enum: TransactionType, description: "Type de transaction (vente / location)" })
  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @ApiProperty({ example: 250000, description: "Montant en DT" })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: "Date de la transaction (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ enum: TransactionStatus, default: TransactionStatus.PENDING })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({
    example: 0.02,
    description: "Taux de commission pour cette transaction (sinon config globale)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  commissionRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    default: true,
    description: "Créer automatiquement l'enregistrement de commission",
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  createCommission?: boolean;
}
