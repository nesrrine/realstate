import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateAdminDto {
  @ApiProperty({ example: "admin@agency.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "SecurePass123!", minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: "John" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ example: "+33612345678" })
  @IsOptional()
  @IsString()
  phone?: string;

  // Admins typically don't have licenseNumber or bio, but we keep them optional for flexibility
  @ApiPropertyOptional({ example: "ADM-75001-2024" })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;
}