import { IsOptional, IsString, IsEnum, IsIn } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { VisitStatus } from "@prisma/client";

export class VisitFilterDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional({ enum: VisitStatus }) @IsOptional() @IsEnum(VisitStatus) status?: VisitStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() fieldAgentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() officeAgentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string;
  @ApiPropertyOptional({ description: "Filter visits from this date (ISO)" }) @IsOptional() @IsString() dateFrom?: string;
  @ApiPropertyOptional({ description: "Filter visits until this date (ISO)" }) @IsOptional() @IsString() dateTo?: string;
  @ApiPropertyOptional({ description: "Search in client name/phone, property title/city" }) @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "asc" }) @IsOptional() @IsIn(["asc", "desc"]) sortOrder?: "asc" | "desc";
}
