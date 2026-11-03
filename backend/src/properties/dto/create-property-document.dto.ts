import { IsString, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreatePropertyDocumentDto {
  @ApiProperty({ description: "Document title" })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: "Document description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Document category" })
  @IsOptional()
  @IsString()
  category?: string;
}