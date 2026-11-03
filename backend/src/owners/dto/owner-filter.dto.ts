import { IsOptional, IsString, IsBoolean } from "class-validator";
import { Type, Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class OwnerFilterDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) limit?: number = 20;
  @ApiPropertyOptional({ description: "Search in name, email, phone, city" })
  @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional()
  @IsOptional() @Transform(({ value }) => value === "true" || value === true) @IsBoolean()
  isActive?: boolean;
  @ApiPropertyOptional({ enum: ["createdAt", "lastName", "firstName"], default: "createdAt" })
  @IsOptional() @IsString() sortBy?: string = "createdAt";
  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional() @IsString() sortOrder?: "asc" | "desc" = "desc";
}
