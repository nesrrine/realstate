import { IsOptional, IsString, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { CommissionPaymentStatus } from "@prisma/client";

export class CommissionFilterDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: "Filtrer par agent terrain" })
  @IsOptional()
  @IsString()
  fieldAgentId?: string;

  @ApiPropertyOptional({ description: "Filtrer par agent bureau" })
  @IsOptional()
  @IsString()
  officeAgentId?: string;

  @ApiPropertyOptional({ description: "Filtrer par transaction" })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({ enum: CommissionPaymentStatus })
  @IsOptional()
  @IsEnum(CommissionPaymentStatus)
  paymentStatus?: CommissionPaymentStatus;
}
