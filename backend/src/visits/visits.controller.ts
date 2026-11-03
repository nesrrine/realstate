import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { VisitsService } from "./visits.service";
import { CreateVisitDto } from "./dto/create-visit.dto";
import { UpdateVisitDto } from "./dto/update-visit.dto";
import { VisitFilterDto } from "./dto/visit-filter.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/enums/role.enum";

@ApiTags("Visits")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("visits")
export class VisitsController {
  constructor(private service: VisitsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "List visits" })
  findAll(@Query() filter: VisitFilterDto, @CurrentUser() user: any) {
    return this.service.findAll(filter, user);
  }

  @Get("stats")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Visit counters (today, upcoming, overdue, completed, this month)" })
  stats(@CurrentUser() user: any) {
    return this.service.stats(user);
  }

  @Get("client/:clientId/count")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiParam({ name: "clientId" })
  @ApiOperation({ summary: "Nombre de visites d'un client (1re = visite, suivantes = revisites)" })
  clientVisitCount(@Param("clientId") clientId: string) {
    return this.service.clientVisitCount(clientId);
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Get visit by ID" })
  findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Schedule a visit" })
  create(@Body() dto: CreateVisitDto, @CurrentUser() user: any) {
    return this.service.create(dto, user);
  }

  @Put(":id")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Update visit" })
  update(@Param("id") id: string, @Body() dto: UpdateVisitDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user);
  }

  @Delete(":id")
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Delete visit" })
  remove(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user);
  }
}
