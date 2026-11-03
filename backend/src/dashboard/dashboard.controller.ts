import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { DashboardFilterDto } from "./dto/dashboard-filter.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/enums/role.enum";

@ApiTags("Dashboard")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get("summary")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({
    summary: "Vue d'ensemble du dashboard",
    description:
      "Biens disponibles, clients, nouveaux leads, visites (jour / à venir), ventes, locations, CA, commissions et top agents.",
  })
  @ApiResponse({ status: 200, description: "Indicateurs agrégés" })
  getSummary(@Query() filter: DashboardFilterDto, @CurrentUser() user: any) {
    return this.service.getSummary(filter, user);
  }

  @Get("sales")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({
    summary: "Statistiques ventes & locations",
    description:
      "Ventes et locations par mois, biens par type, transactions par type de bien, distribution des prix.",
  })
  getSalesStats(@Query() filter: DashboardFilterDto, @CurrentUser() user: any) {
    return this.service.getSalesStats(filter, user);
  }

  @Get("leads")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({
    summary: "Statistiques leads",
    description: "Leads par source, par statut, conversion et évolution mensuelle.",
  })
  getLeadsStats(@Query() filter: DashboardFilterDto, @CurrentUser() user: any) {
    return this.service.getLeadsStats(filter, user);
  }

  @Get("agents")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: "Performance des agents",
    description:
      "CA, ventes, locations, commissions, clients actifs, leads en cours et visites par agent.",
  })
  getAgentsPerformance(@Query() filter: DashboardFilterDto, @CurrentUser() user: any) {
    return this.service.getAgentsPerformance(filter, user);
  }
}