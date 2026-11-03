import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, IsArray } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { LeadStatus, LeadSource } from "@prisma/client";

export class CreateLeadDto {
  @ApiProperty() @IsString() @IsNotEmpty() clientId: string;
  @ApiPropertyOptional({ description: "Single property ID (deprecated, use propertyIds)" })
  @IsOptional() @IsString() propertyId?: string;
  @ApiPropertyOptional({ type: [String], description: "Multiple property IDs" })
  @IsOptional() @IsArray() @IsString({ each: true }) propertyIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() agentId?: string;
  @ApiPropertyOptional({ enum: LeadStatus, default: "NEW" }) @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @ApiPropertyOptional({ enum: LeadSource, default: LeadSource.OTHER })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ example: 300000 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) budget?: number;
}