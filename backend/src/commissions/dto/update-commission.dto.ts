import {
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsDateString,
  IsString,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { CommissionPaymentStatus } from "@prisma/client";

export class UpdateCommissionDto {
  @ApiPropertyOptional({ example: 0.02, description: "Taux de commission" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  commissionRate?: number;

  @ApiPropertyOptional({ example: 0.3, description: "Part agent terrain" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  fieldAgentShareRate?: number;

  @ApiPropertyOptional({ example: 0.2, description: "Part agent bureau" })
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

  @ApiPropertyOptional({ description: "Date de paiement (ISO)" })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
