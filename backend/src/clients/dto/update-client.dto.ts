import { PartialType } from "@nestjs/swagger";
import { IsOptional, IsBoolean } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { CreateClientDto } from "./create-client.dto";

export class UpdateClientDto extends PartialType(CreateClientDto) {
  @ApiPropertyOptional({ description: "Activate or deactivate client" })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
