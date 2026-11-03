import { IsOptional, IsEnum, IsDateString, IsInt, Min, Max, IsString, IsArray } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { VisitStatus, VisitType } from "@prisma/client";

export class UpdateVisitDto {
  @ApiPropertyOptional({ enum: VisitStatus }) @IsOptional() @IsEnum(VisitStatus) status?: VisitStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() completedAt?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(15) duration?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() feedback?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 5 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) rating?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() fieldAgentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() officeAgentId?: string;
  @ApiPropertyOptional({ enum: VisitType }) @IsOptional() @IsEnum(VisitType) visitType?: VisitType;
  @ApiPropertyOptional({ description: "Client ID (optional on update)" })
  @IsOptional() @IsString() clientId?: string;
  @ApiPropertyOptional({ type: [String], description: "Multiple property IDs (optional on update)" })
  @IsOptional() @IsArray() @IsString({ each: true }) propertyIds?: string[];
}
