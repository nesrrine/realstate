
import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionStatus } from '@prisma/client';

export class UpdateTransactionDto {
  @ApiPropertyOptional({
    example: 250000,
    description: 'Nouveau montant de la transaction en DT',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({
    allowNaN: false,
    allowInfinity: false,
  })
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({
    example: '2026-11-13',
    description: 'Nouvelle date de transaction',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    enum: TransactionStatus,
    description: 'Nouveau statut de la transaction',
  })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({
    example: 'Informations complémentaires',
    description: 'Notes concernant la transaction',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Identifiant du nouvel agent terrain',
    example: 'cm123456789',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fieldAgentId?: string;

  @ApiPropertyOptional({
    description: 'Identifiant du nouvel agent bureau',
    example: 'cm987654321',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  officeAgentId?: string;
}
