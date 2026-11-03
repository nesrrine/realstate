import { IsString, IsOptional, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { LeadStatus, LeadSource } from "@prisma/client";

export class LeadFilterDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) limit?: number = 20;

  @ApiPropertyOptional() @IsOptional() @IsString() agentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string;

  @ApiPropertyOptional({ enum: LeadStatus }) @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @ApiPropertyOptional({ enum: LeadSource }) @IsOptional() @IsEnum(LeadSource) source?: LeadSource;

  @ApiPropertyOptional() @IsOptional() @IsString() sortBy?: string = "createdAt";
  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional() @IsString() sortOrder?: "asc" | "desc" = "desc";
}