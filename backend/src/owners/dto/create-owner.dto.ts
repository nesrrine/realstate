import { IsString, IsNotEmpty, IsOptional, IsEmail, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateOwnerDto {
  @ApiProperty({ example: "Jean" })
  @IsString() @IsNotEmpty() @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: "Dupont" })
  @IsString() @IsNotEmpty() @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: "+33612345678" })
  @IsString() @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: "+33612345678" })
  @IsOptional() @IsString()
  whatsapp?: string;

  @ApiPropertyOptional({ example: "jean.dupont@example.com" })
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "12 rue de la Paix" })
  @IsOptional() @IsString()
  address?: string;

  @ApiPropertyOptional({ example: "Paris" })
  @IsOptional() @IsString()
  city?: string;

  @ApiPropertyOptional({ example: "75001" })
  @IsOptional() @IsString()
  zipCode?: string;

  @ApiPropertyOptional({ example: "TN", default: "TN" })
  @IsOptional() @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}
