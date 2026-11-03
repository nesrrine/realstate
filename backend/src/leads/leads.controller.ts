import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { LeadsService } from "./leads.service";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { UpdateLeadDto } from "./dto/update-lead.dto";
import { LeadFilterDto } from "./dto/lead-filter.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/enums/role.enum";

@ApiTags("Leads")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("leads")
export class LeadsController {
  constructor(private service: LeadsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "List leads with filters" })
  findAll(@Query() filter: LeadFilterDto, @CurrentUser() user: any) {
    return this.service.findAll(filter, user);
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Get lead by ID" })
  findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Create lead" })
  create(@Body() dto: CreateLeadDto, @CurrentUser() user: any) {
    return this.service.create(dto, user);
  }

  @Put(":id")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Update lead status/notes" })
  update(@Param("id") id: string, @Body() dto: UpdateLeadDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user);
  }

  @Delete(":id")
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Delete lead" })
  remove(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user);
  }
}