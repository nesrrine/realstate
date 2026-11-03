import {
  ArrayMaxSize, IsArray, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const LANGUAGES = ["fr", "ar", "tn"];

export class PropertyDescriptionDto {
  @ApiProperty({ description: "Valeurs actuelles du formulaire de bien" })
  @IsObject()
  property: Record<string, unknown>;

  @ApiPropertyOptional({ enum: LANGUAGES, default: "fr" })
  @IsOptional()
  @IsIn(LANGUAGES)
  language?: "fr" | "ar" | "tn";
}

export class PropertyFromTextDto {
  @ApiProperty({ example: "Appart S+3 Aouina 140m² 3e étage ascenseur, 320 mille, titre bleu" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text: string;
}

export class VisitMessageDto {
  @ApiPropertyOptional({ enum: LANGUAGES, default: "fr" })
  @IsOptional()
  @IsIn(LANGUAGES)
  language?: "fr" | "ar" | "tn";
}

export class VisitReportDto {
  @ApiProperty({ example: "a aimé la cuisine, trouve le prix élevé, veut revenir avec sa femme" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  notes: string;
}

export class PublicSearchDto {
  @ApiProperty({ example: "S+2 meublé près de La Marsa moins de 1500 DT" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  query: string;
}

export class ChatTurnDto {
  @ApiProperty({ enum: ["user", "assistant"] })
  @IsIn(["user", "assistant"])
  role: "user" | "assistant";

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;
}

export class PublicChatDto {
  @ApiProperty({ type: [ChatTurnDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  messages: ChatTurnDto[];
}
