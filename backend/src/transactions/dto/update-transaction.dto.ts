
import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsDateString,
  IsEnum,
} from "class-validator";

import { Type } from "class-transformer";

import { ApiPropertyOptional } from "@nestjs/swagger";

import { TransactionStatus } from "@prisma/client";

export class UpdateTransactionDto {
  @ApiPropertyOptional({
    example: 250000,
    description: "Nouveau montant de la transaction",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({
    description: "Nouvelle date de transaction",
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    enum: TransactionStatus,
  })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: "Nouvel agent terrain",
  })
  @IsOptional()
  @IsString()
  fieldAgentId?: string;

  @ApiPropertyOptional({
    description: "Nouvel agent bureau",
  })
  @IsOptional()
  @IsString()
  officeAgentId?: string;
}
