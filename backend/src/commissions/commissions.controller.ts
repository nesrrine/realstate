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
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from "@nestjs/swagger";
import { CommissionsService } from "./commissions.service";
import { CreateCommissionDto } from "./dto/create-commission.dto";
import { UpdateCommissionDto } from "./dto/update-commission.dto";
import { CommissionFilterDto } from "./dto/commission-filter.dto";
import { CommissionStatsDto } from "./dto/commission-stats.dto";
import { UpdateCommissionConfigDto } from "./dto/update-commission-config.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/enums/role.enum";

@ApiTags("Commissions")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("commissions")
export class CommissionsController {
  constructor(private service: CommissionsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Liste des commissions (pagination, filtres)" })
  @ApiResponse({ status: 200, description: "Liste paginée" })
  findAll(@Query() filter: CommissionFilterDto, @CurrentUser() user: any) {
    return this.service.findAll(filter, user);
  }

  @Get("stats")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Statistiques des commissions" })
  getStats(@Query() filter: CommissionStatsDto, @CurrentUser() user: any) {
    return this.service.getStats(filter, user);
  }

  @Get("config")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({
    summary: "Configuration des taux de commission",
    description:
      "Défauts : acheteur 2 %, vendeur 2 %. Total = montant × (taux acheteur + taux vendeur). Agence = total × (1 − part terrain − part bureau).",
  })
  getConfig() {
    return this.service.getConfig();
  }

  @Put("config")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Modifier les taux de commission (ADMIN/MANAGER)" })
  updateConfig(@Body() dto: UpdateCommissionConfigDto) {
    return this.service.updateConfig(dto);
  }

  @Get("default-rates")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Alias de GET /commissions/config (rétrocompatibilité)" })
  getDefaultRates() {
    return this.service.getConfig();
  }

  @Get("calculate-preview")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({
    summary: "Simuler le calcul de commission sans enregistrement",
    description:
      "Ex. amount=250000, buyer=0.02, seller=0.02 → buyerAmount=5000, sellerAmount=5000, amount=10000",
  })
  @ApiQuery({ name: "amount", type: Number, required: true, example: 250000 })
  @ApiQuery({ name: "buyerCommissionRate", type: Number, required: false, example: 0.02 })
  @ApiQuery({ name: "sellerCommissionRate", type: Number, required: false, example: 0.02 })
  @ApiQuery({ name: "fieldAgentShareRate", type: Number, required: false, example: 0.3 })
  @ApiQuery({ name: "officeAgentShareRate", type: Number, required: false, example: 0.2 })
  calculatePreview(
    @Query("amount") amount: string,
    @Query("buyerCommissionRate") buyer?: string,
    @Query("sellerCommissionRate") seller?: string,
    @Query("fieldAgentShareRate") field?: string,
    @Query("officeAgentShareRate") office?: string,
  ) {
    const num = (v?: string) => (v !== undefined && v !== "" ? parseFloat(v) : undefined);
    return this.service.calculatePreview(parseFloat(amount), {
      buyerCommissionRate: num(buyer),
      sellerCommissionRate: num(seller),
      fieldAgentShareRate: num(field),
      officeAgentShareRate: num(office),
    });
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Détail d'une commission" })
  findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: "Créer une commission pour une transaction",
    description:
      "Les montants buyerAmount, sellerAmount, agencyAmount, fieldAgentAmount et officeAgentAmount sont calculés automatiquement.",
  })
  create(@Body() dto: CreateCommissionDto, @CurrentUser() user: any) {
    return this.service.create(dto, user);
  }

  @Put(":id")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Mettre à jour une commission (taux, statut de paiement)" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateCommissionDto,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Supprimer une commission (ADMIN)" })
  remove(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user);
  }
}