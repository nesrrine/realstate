import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCommissionDto {
  @ApiProperty({ description: "ID de la transaction liée" })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiPropertyOptional({
    example: 0.02,
    description:
      "Taux commission acheteur (0.02 = 2 %). Si omis, utilise la configuration globale.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  buyerCommissionRate?: number;

  @ApiPropertyOptional({
    example: 0.02,
    description:
      "Taux commission vendeur/propriétaire (0.02 = 2 %). Si omis, utilise la configuration globale.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  sellerCommissionRate?: number;

  @ApiPropertyOptional({
    example: 0.3,
    description: "Part agent terrain sur la commission totale (0.3 = 30 %)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  fieldAgentShareRate?: number;

  @ApiPropertyOptional({
    example: 0.2,
    description: "Part agent bureau sur la commission totale (0.2 = 20 %)",
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
}