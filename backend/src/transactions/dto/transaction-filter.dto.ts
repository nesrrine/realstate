import { IsOptional, IsString, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionType, TransactionStatus } from "@prisma/client";

export class TransactionFilterDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: "Recherche libre (propriété, client, agent)" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: TransactionType, description: "Alias: transactionType" })
  @IsOptional()
  @IsEnum(TransactionType)
  transactionType?: TransactionType;

  @ApiPropertyOptional({ enum: TransactionType, deprecated: true })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fieldAgentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  officeAgentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientId?: string;
}
