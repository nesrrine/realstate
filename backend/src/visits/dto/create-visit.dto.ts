import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsInt, IsArray, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VisitStatus, VisitType } from "@prisma/client";

export class CreateVisitDto {
  @ApiProperty() @IsString() @IsNotEmpty() clientId: string;
  @ApiPropertyOptional({ description: "Single property ID (deprecated, use propertyIds)" })
  @IsOptional() @IsString() propertyId?: string;
  @ApiPropertyOptional({ type: [String], description: "Multiple property IDs" })
  @IsOptional() @IsArray() @IsString({ each: true }) propertyIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() fieldAgentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() officeAgentId?: string;
  @ApiPropertyOptional({ enum: VisitType, default: "IN_PERSON" }) @IsOptional() @IsEnum(VisitType) visitType?: VisitType;
  @ApiProperty({ example: "2026-11-15T10:00:00.000Z" }) @IsDateString() scheduledAt: string;
  @ApiPropertyOptional({ enum: VisitStatus, default: "SCHEDULED" }) @IsOptional() @IsEnum(VisitStatus) status?: VisitStatus;
  @ApiPropertyOptional({ example: 60, description: "Duration in minutes" }) @IsOptional() @Type(() => Number) @IsInt() @Min(15) @Max(480) duration?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() feedback?: string;
}