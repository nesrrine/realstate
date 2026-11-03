import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { StudioService } from "./studio.service";
import { CreateStudioDto, STUDIO_TEMPLATES, STUDIO_FORMATS, STUDIO_STATUSES, STUDIO_PLATFORMS } from "./dto/create-studio.dto";
import { UpdateStudioDto } from "./dto/update-studio.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/enums/role.enum";

@ApiTags("IMMOBILIER STUDIO")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard)
@Controller("studio")
export class StudioController {
  constructor(private studioService: StudioService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Créer une création d'affiche" })
  @ApiResponse({ status: 201, description: "Création créée" })
  create(@Body() dto: CreateStudioDto, @CurrentUser() user: any) {
    return this.studioService.create(dto, user.id, user.role);
  }

  @Get()
  @ApiOperation({ summary: "Liste des créations" })
  @ApiQuery({ name: "template", required: false, enum: STUDIO_TEMPLATES })
  @ApiQuery({ name: "propertyId", required: false, type: String })
  @ApiQuery({ name: "status", required: false, enum: STUDIO_STATUSES })
  @ApiResponse({ status: 200, description: "Liste paginée" })
  list(
    @Query("template") template?: string,
    @Query("propertyId") propertyId?: string,
    @Query("status") status?: string,
    @CurrentUser() user?: any,
  ) {
    return this.studioService.list(user.id, user.role, { template, propertyId, status });
  }

  @Get("stats")
  @ApiOperation({ summary: "Statistiques des créations" })
  @ApiResponse({ status: 200, description: "Statistiques" })
  stats(@CurrentUser() user: any) {
    return this.studioService.stats(user.id, user.role);
  }

  @Get(":id")
  @ApiOperation({ summary: "Détail d'une création" })
  @ApiParam({ name: "id", description: "StudioCreation CUID" })
  @ApiResponse({ status: 200, description: "Création" })
  @ApiResponse({ status: 404, description: "Not found" })
  detail(@Param("id") id: string, @CurrentUser() user: any) {
    return this.studioService.detail(id, user.id, user.role);
  }

  @Put(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Modifier une création" })
  @ApiParam({ name: "id", description: "StudioCreation CUID" })
  @ApiResponse({ status: 200, description: "Création modifiée" })
  update(@Param("id") id: string, @Body() dto: UpdateStudioDto, @CurrentUser() user: any) {
    return this.studioService.update(id, dto, user.id, user.role);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Supprimer une création" })
  @ApiParam({ name: "id", description: "StudioCreation CUID" })
  @ApiResponse({ status: 200, description: "Deleted" })
  remove(@Param("id") id: string, @CurrentUser() user: any) {
    return this.studioService.remove(id, user.id, user.role);
  }
}