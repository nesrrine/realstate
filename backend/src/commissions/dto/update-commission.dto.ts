import {
  IsOptional,
  IsNumber,
  IsString,
  IsEnum,
  IsDateString,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { CommissionPaymentStatus } from "@prisma/client";

export class UpdateCommissionDto {
  @ApiPropertyOptional({ example: 0.02, description: "Taux commission acheteur (0.02 = 2 %)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  buyerCommissionRate?: number;

  @ApiPropertyOptional({
    example: 0.02,
    description: "Taux commission vendeur/propriétaire (0.02 = 2 %)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  sellerCommissionRate?: number;

  @ApiPropertyOptional({ example: 0.3, description: "Part agent terrain sur le total" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  fieldAgentShareRate?: number;

  @ApiPropertyOptional({ example: 0.2, description: "Part agent bureau sur le total" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  officeAgentShareRate?: number;

  @ApiPropertyOptional({ enum: CommissionPaymentStatus })
  @IsOptional()
  @IsEnum(CommissionPaymentStatus)
  paymentStatus?: CommissionPaymentStatus;

  @ApiPropertyOptional({ description: "Date de paiement (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}