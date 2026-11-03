import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse,
} from "@nestjs/swagger";
import { OwnersService } from "./owners.service";
import { CreateOwnerDto } from "./dto/create-owner.dto";
import { UpdateOwnerDto } from "./dto/update-owner.dto";
import { OwnerFilterDto } from "./dto/owner-filter.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/enums/role.enum";

@ApiTags("Owners")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("owners")
export class OwnersController {
  constructor(private service: OwnersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "List owners (ADMIN/MANAGER/AGENT)" })
  findAll(@Query() filter: OwnerFilterDto, @CurrentUser() user: any) {
    return this.service.findAll(filter, user);
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Get owner with properties and transactions" })
  findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Create owner (ADMIN/MANAGER/AGENT)" })
  @ApiResponse({ status: 201 })
  create(@Body() dto: CreateOwnerDto, @CurrentUser() user: any) {
    return this.service.create(dto, user);
  }

  @Put(":id")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Update owner" })
  update(@Param("id") id: string, @Body() dto: UpdateOwnerDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Deactivate owner (ADMIN only)" })
  remove(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user);
  }
}