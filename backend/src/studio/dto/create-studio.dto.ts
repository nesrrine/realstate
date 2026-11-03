import { IsString, IsOptional, IsArray, IsIn, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export const STUDIO_TEMPLATES = ["BLUE_PREMIUM", "BLUE_MODERN", "LUXURY", "MINIMAL", "FLASH_SALE"] as const;
export const STUDIO_FORMATS = ["PORTRAIT", "STORY", "SQUARE"] as const;
export const STUDIO_STATUSES = ["DRAFT", "EXPORTED", "SHARED"] as const;
export const STUDIO_PLATFORMS = ["WHATSAPP", "FACEBOOK", "COPY", "ZIP", "DOWNLOAD"] as const;

export type StudioTemplate = (typeof STUDIO_TEMPLATES)[number];
export type StudioFormat = (typeof STUDIO_FORMATS)[number];
export type StudioStatus = (typeof STUDIO_STATUSES)[number];
export type StudioPlatform = (typeof STUDIO_PLATFORMS)[number];

export class CreateStudioDto {
  @ApiProperty({ description: "Property CUID source" })
  @IsString()
  propertyId: string;

  @ApiProperty({ enum: STUDIO_TEMPLATES, example: "BLUE_PREMIUM" })
  @IsString()
  @IsIn(STUDIO_TEMPLATES)
  template: StudioTemplate;

  @ApiProperty({ enum: STUDIO_FORMATS, example: "PORTRAIT" })
  @IsString()
  @IsIn(STUDIO_FORMATS)
  format: StudioFormat;

  @ApiPropertyOptional({ example: "Terrain à vendre à Chotrana 3" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  imageUrls?: string[];

  @ApiPropertyOptional({ example: "Description française..." })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descriptionFr?: string;

  @ApiPropertyOptional({ example: "Description tunisienne..." })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descriptionTn?: string;

  @ApiPropertyOptional({ example: "Description Instagram..." })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descriptionIg?: string;

  @ApiPropertyOptional({ enum: STUDIO_STATUSES, default: "DRAFT" })
  @IsOptional()
  @IsString()
  @IsIn(STUDIO_STATUSES)
  status?: StudioStatus;

  @ApiPropertyOptional({ enum: STUDIO_PLATFORMS })
  @IsOptional()
  @IsString()
  @IsIn(STUDIO_PLATFORMS)
  platform?: StudioPlatform;

  @ApiPropertyOptional({ example: "https://..." })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  shareUrl?: string;

  @ApiPropertyOptional({ description: "Éditeur : couleurs, police, positionnement" })
  @IsOptional()
  metadata?: Record<string, unknown>;
}