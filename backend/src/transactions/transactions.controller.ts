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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from "@nestjs/swagger";
import { TransactionsService } from "./transactions.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";
import { TransactionFilterDto } from "./dto/transaction-filter.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/enums/role.enum";

@ApiTags("Transactions")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("transactions")
export class TransactionsController {
  constructor(private service: TransactionsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Liste des transactions (pagination, filtres)" })
  @ApiResponse({ status: 200, description: "Liste paginée avec relations property, client, owner, agent, commission" })
  findAll(@Query() filter: TransactionFilterDto, @CurrentUser() user: any) {
    return this.service.findAll(filter, user);
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Détail d'une transaction" })
  findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: "Créer une transaction (ADMIN/MANAGER)",
    description:
      "Crée la transaction et, par défaut, la commission associée (montants calculés selon GET /commissions/config).",
  })
  create(@Body() dto: CreateTransactionDto, @CurrentUser() user: any) {
    return this.service.create(dto, user);
  }

  @Put(":id")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Mettre à jour une transaction" })
  update(@Param("id") id: string, @Body() dto: UpdateTransactionDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Supprimer une transaction (ADMIN)" })
  remove(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user);
  }
}