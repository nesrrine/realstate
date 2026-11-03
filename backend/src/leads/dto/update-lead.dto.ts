import { IsOptional, IsEnum, IsString, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { LeadStatus, LeadSource } from "@prisma/client";

export class UpdateLeadDto {
  @ApiPropertyOptional({ enum: LeadStatus }) @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @ApiPropertyOptional({ enum: LeadSource })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) budget?: number;
}
