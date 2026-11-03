import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { Transform } from "class-transformer";

export const CONTACT_TYPES = ["achat", "location", "vente", "estimation", "autre"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class PublicContactDto {
  @ApiProperty({ example: "Sami Ben Ali" })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: "Votre nom est requis" })
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: "+216 98 123 456" })
  @Transform(trim)
  @IsString()
  @Matches(/^[+\d][\d\s.()-]{7,19}$/, { message: "Numéro de téléphone invalide" })
  phone: string;

  @ApiPropertyOptional({ example: "sami@example.com" })
  @Transform(({ value }) => (typeof value === "string" && value.trim() ? value.trim() : undefined))
  @IsOptional()
  @IsEmail({}, { message: "E-mail invalide" })
  @MaxLength(150)
  email?: string;

  @ApiProperty({ enum: CONTACT_TYPES })
  @IsIn(CONTACT_TYPES)
  type: ContactType;

  @ApiProperty({ example: "Je souhaite visiter ce bien samedi." })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: "Votre message est requis" })
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({ description: "Bien concerné (fiche du site)" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  propertyId?: string;

  /** Champ piège invisible pour les robots : rempli = spam, ignoré sans erreur. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
