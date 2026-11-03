import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CashService } from "./cash.service";
import {
  CashAccessDto, CashDayQueryDto, CashSummaryQueryDto, CreateCashEntryDto, VisitFeeDto,
} from "./dto/cash.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/enums/role.enum";

// Les agents passent le RolesGuard ; le service vérifie ensuite l'autorisation du gérant.
@ApiTags("Cash")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("cash")
export class CashController {
  constructor(private service: CashService) {}

  @Get("access")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Current user can access visit fees / expenses?" })
  async access(@CurrentUser() user: any) {
    return { allowed: await this.service.hasAccess(user) };
  }

  @Put("access/:agentId")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiParam({ name: "agentId" })
  @ApiOperation({ summary: "Grant / revoke an agent's access (manager)" })
  setAccess(@Param("agentId") agentId: string, @Body() dto: CashAccessDto) {
    return this.service.setAgentAccess(agentId, dto.enabled);
  }

  @Get("day")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Entries and totals of one day" })
  day(@Query() q: CashDayQueryDto, @CurrentUser() user: any) {
    return this.service.findDay(q.date, user);
  }

  @Get("summary")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Totals per day over a period" })
  summary(@Query() q: CashSummaryQueryDto, @CurrentUser() user: any) {
    return this.service.summary(q.from, q.to, user);
  }

  @Get("visits")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Visits of a day (to link a visit fee)" })
  visits(@Query() q: CashDayQueryDto, @CurrentUser() user: any) {
    return this.service.visitsOfDay(q.date, user);
  }

  @Put("visits/:visitId/fee")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiParam({ name: "visitId" })
  @ApiOperation({ summary: "Mark a completed visit's fee as paid / unpaid" })
  setVisitFee(@Param("visitId") visitId: string, @Body() dto: VisitFeeDto, @CurrentUser() user: any) {
    return this.service.setVisitFee(visitId, dto, user);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Add a visit fee or an expense" })
  create(@Body() dto: CreateCashEntryDto, @CurrentUser() user: any) {
    return this.service.create(dto, user);
  }

  @Delete(":id")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Delete an entry" })
  remove(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user);
  }
}
