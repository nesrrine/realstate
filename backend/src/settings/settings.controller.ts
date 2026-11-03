import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { Type } from "class-transformer";
import { AgencySettingsService } from "./agency-settings.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";

export class UpdateAgencySettingsDto {
  @ApiPropertyOptional({ example: "Le Portail Immobilier" })
  @IsOptional() @IsString() @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: "12 avenue Habib Bourguiba, La Soukra" })
  @IsOptional() @IsString() @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ example: "https://maps.app.goo.gl/xxxx" })
  @IsOptional() @IsString() @MaxLength(500)
  mapsUrl?: string;

  @ApiPropertyOptional({ example: "71 000 000" })
  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 20, description: "Frais de visite (DT)" })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(10000)
  visitFee?: number;
}

@ApiTags("Settings")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("settings")
export class SettingsController {
  constructor(private agency: AgencySettingsService) {}

  @Get("agency")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Coordonnées de l'agence et frais de visite" })
  getAgency() {
    return this.agency.get();
  }

  @Put("agency")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Modifier les coordonnées de l'agence (gérant)" })
  updateAgency(@Body() dto: UpdateAgencySettingsDto) {
    return this.agency.update(dto);
  }
}
