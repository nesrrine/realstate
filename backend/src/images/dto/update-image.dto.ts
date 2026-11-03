import { IsOptional, IsString, IsBoolean, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateImageDto {
  @ApiPropertyOptional({ example: "Vue du salon" })
  @IsOptional()
  @IsString()
  altText?: string;

  @ApiPropertyOptional({ example: true, description: "Set as cover photo" })
  @IsOptional()
  @IsBoolean()
  isCover?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}
