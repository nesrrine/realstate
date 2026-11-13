
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";

import { CommissionsService } from "./commissions.service";

import { UpdateCommissionConfigDto } from "./dto/update-commission-config.dto";
import { CommissionFilterDto } from "./dto/commission-filter.dto";
import { CommissionStatsDto } from "./dto/commission-stats.dto";
import { CreateCommissionDto } from "./dto/create-commission.dto";
import { UpdateCommissionDto } from "./dto/update-commission.dto";

import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";

import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";

import { Role } from "../common/enums/role.enum";

@Controller("commissions")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommissionsController {
  constructor(
    private readonly commissionsService: CommissionsService,
  ) {}

  // GET /commissions
  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  findAll(
    @Query() query: CommissionFilterDto,
    @CurrentUser() user: any,
  ) {
    return this.commissionsService.findAll(query, user);
  }

  // GET /commissions/stats
  @Get("stats")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  getStats(
    @Query() filter: CommissionStatsDto,
    @CurrentUser() user: any,
  ) {
    return this.commissionsService.getStats(filter, user);
  }

  // GET /commissions/config
  @Get("config")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  getConfig() {
    return this.commissionsService.getConfig();
  }

  // PUT /commissions/config
  @Put("config")
  @Roles(Role.ADMIN, Role.MANAGER)
  updateConfig(
    @Body() dto: UpdateCommissionConfigDto,
  ) {
    return this.commissionsService.updateConfig(dto);
  }

  // GET /commissions/default-rates
  @Get("default-rates")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  getDefaultRates() {
    return this.commissionsService.getDefaultRates();
  }

  // GET /commissions/calculate-preview
  @Get("calculate-preview")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  calculatePreview(
    @Query("amount") amount: string,
    @Query("buyerCommissionRate") buyer?: string,
    @Query("sellerCommissionRate") seller?: string,
    @Query("fieldAgentShareRate") field?: string,
    @Query("officeAgentShareRate") office?: string,
  ) {
    const transactionAmount = Number(amount);

    if (
      amount === undefined ||
      amount.trim() === "" ||
      !Number.isFinite(transactionAmount) ||
      transactionAmount < 0
    ) {
      throw new BadRequestException(
        "Le montant de la transaction est invalide",
      );
    }

    const parseRate = (
      value?: string,
    ): number | undefined => {
      if (value === undefined || value.trim() === "") {
        return undefined;
      }

      const parsed = Number(value);

      if (
        !Number.isFinite(parsed) ||
        parsed < 0 ||
        parsed > 1
      ) {
        throw new BadRequestException(
          "Les taux doivent être compris entre 0 et 1",
        );
      }

      return parsed;
    };

    return this.commissionsService.calculatePreview(
      transactionAmount,
      {
        buyerCommissionRate: parseRate(buyer),
        sellerCommissionRate: parseRate(seller),
        fieldAgentShareRate: parseRate(field),
        officeAgentShareRate: parseRate(office),
      },
    );
  }

  // GET /commissions/:id
  @Get(":id")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  findOne(
    @Param("id") id: string,
    @CurrentUser() user: any,
  ) {
    return this.commissionsService.findOne(id, user);
  }

  // POST /commissions
  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  create(
    @Body() dto: CreateCommissionDto,
    @CurrentUser() user: any,
  ) {
    return this.commissionsService.create(dto, user);
  }

  // PUT /commissions/:id
  @Put(":id")
  @Roles(Role.ADMIN, Role.MANAGER)
  update(
    @Param("id") id: string,
    @Body() dto: UpdateCommissionDto,
    @CurrentUser() user: any,
  ) {
    return this.commissionsService.update(id, dto, user);
  }

  // DELETE /commissions/:id
  @Delete(":id")
  @Roles(Role.ADMIN, Role.MANAGER)
  remove(
    @Param("id") id: string,
    @CurrentUser() user: any,
  ) {
    return this.commissionsService.remove(id, user);
  }
}
