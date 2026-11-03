import { PartialType } from "@nestjs/swagger";
import { IsOptional, IsBoolean } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { CreateOwnerDto } from "./create-owner.dto";

export class UpdateOwnerDto extends PartialType(CreateOwnerDto) {
  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
