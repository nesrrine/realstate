import { IsArray, IsString, ArrayMinSize } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ReorderImagesDto {
  @ApiProperty({
    description: "Ordered array of image IDs (first = cover, then order 1, 2, ...)",
    example: ["img_id_1", "img_id_2", "img_id_3"],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  imageIds: string[];
}
