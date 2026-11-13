
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
  ParseUUIDPipe,
} from "@nestjs/common";

import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from "@nestjs/swagger";

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
  constructor(
    private readonly transactionsService: TransactionsService,
  ) {}

  /**
   * GET /transactions
   * Liste paginée des transactions.
   */
  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({
    summary: "Lister les transactions",
    description:
      "Retourne une liste paginée avec filtres et recherche. " +
      "Les agents ne voient que leurs propres transactions.",
  })
  @ApiResponse({
    status: 200,
    description:
      "Liste paginée avec les relations property, client, owner, agents et commission.",
  })
  @ApiResponse({
    status: 401,
    description: "Non authentifié.",
  })
  findAll(
    @Query() filter: TransactionFilterDto,
    @CurrentUser() user: any,
  ) {
    return this.transactionsService.findAll(filter, user);
  }

  /**
   * GET /transactions/:id
   * Détail d'une transaction.
   */
  @Get(":id")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({
    summary: "Récupérer une transaction",
    description:
      "Retourne les détails complets d'une transaction avec sa commission.",
  })
  @ApiParam({
    name: "id",
    description: "Identifiant de la transaction",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Transaction trouvée.",
  })
  @ApiResponse({
    status: 403,
    description: "Accès refusé à cette transaction.",
  })
  @ApiResponse({
    status: 404,
    description: "Transaction introuvable.",
  })
  findOne(
    @Param("id") id: string,
    @CurrentUser() user: any,
  ) {
    return this.transactionsService.findOne(id, user);
  }

  /**
   * POST /transactions
   * Création d'une transaction.
   */
  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: "Créer une transaction",
    description:
      "Crée une transaction et sa commission associée par défaut. " +
      "Les taux sont récupérés depuis la configuration des commissions.",
  })
  @ApiResponse({
    status: 201,
    description: "Transaction créée avec succès.",
  })
  @ApiResponse({
    status: 400,
    description: "Données invalides ou erreur de calcul de commission.",
  })
  @ApiResponse({
    status: 403,
    description: "Seuls ADMIN et MANAGER peuvent créer une transaction.",
  })
  create(
    @Body() dto: CreateTransactionDto,
    @CurrentUser() user: any,
  ) {
    return this.transactionsService.create(dto, user);
  }

  /**
   * PUT /transactions/:id
   * Modification d'une transaction.
   */
  @Put(":id")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: "Modifier une transaction",
    description:
      "Modifie le montant, la date, le statut, les notes et les agents. " +
      "Lorsque le montant change, la commission existante est recalculée " +
      "avec les taux historiques. Une commission déjà payée ne peut pas " +
      "être recalculée.",
  })
  @ApiParam({
    name: "id",
    description: "Identifiant de la transaction à modifier",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Transaction modifiée avec succès.",
  })
  @ApiResponse({
    status: 400,
    description: "Données invalides ou commission déjà payée.",
  })
  @ApiResponse({
    status: 403,
    description: "Modification réservée à ADMIN et MANAGER.",
  })
  @ApiResponse({
    status: 404,
    description: "Transaction introuvable.",
  })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateTransactionDto,
    @CurrentUser() user: any,
  ) {
    return this.transactionsService.update(id, dto, user);
  }

  /**
   * DELETE /transactions/:id
   * Suppression d'une transaction.
   */
  @Delete(":id")
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Supprimer une transaction",
    description:
      "Supprime une transaction. Cette opération est réservée à ADMIN.",
  })
  @ApiParam({
    name: "id",
    description: "Identifiant de la transaction à supprimer",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Transaction supprimée avec succès.",
  })
  @ApiResponse({
    status: 403,
    description: "Seul ADMIN peut supprimer une transaction.",
  })
  @ApiResponse({
    status: 404,
    description: "Transaction introuvable.",
  })
  remove(
    @Param("id") id: string,
    @CurrentUser() user: any,
  ) {
    return this.transactionsService.remove(id, user);
  }
}
