import { IsEmail, IsOptional, IsString, IsNotEmpty } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: "john.doe@example.com" })
  @IsOptional()
  @IsEmail({}, { message: "Adresse email invalide" })
  email?: string;

  @ApiPropertyOptional({ example: "John" })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Le prénom ne peut pas être vide" })
  firstName?: string;

  @ApiPropertyOptional({ example: "Doe" })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Le nom ne peut pas être vide" })
  lastName?: string;

  @ApiPropertyOptional({ example: "+33612345678" })
  @IsOptional()
  @IsString()
  phone?: string;
}
