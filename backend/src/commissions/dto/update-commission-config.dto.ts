import { IsOptional, IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateCommissionConfigDto {
  @ApiPropertyOptional({
    example: 0.02,
    description: "Taux de commission global (0.02 = 2 %). Ex. 250 000 DT → 5 000 DT",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  commissionRate?: number;

  @ApiPropertyOptional({
    example: 0.3,
    description: "Part de l'agent terrain sur la commission totale (0.3 = 30 %)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  fieldAgentShareRate?: number;

  @ApiPropertyOptional({
    example: 0.2,
    description: "Part de l'agent bureau sur la commission totale (0.2 = 20 %)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  officeAgentShareRate?: number;
}
