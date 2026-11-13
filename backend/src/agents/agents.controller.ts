
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";

import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { AgentsService, Actor } from "./agents.service";
import { CreateAgentDto } from "./dto/create-agent.dto";
import { UpdateAgentDto } from "./dto/update-agent.dto";
import { AgentFilterDto } from "./dto/agent-filter.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";

import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { CurrentUser } from "../common/decorators/current-user.decorator";

const toActor = (user: any): Actor => ({
  userId: user.id ?? user.userId,
  role: user.role,
});

@ApiTags("Agents")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("agents")
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  // Liste des agents pour les dropdowns
  @Get("options")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "List agents for dropdowns" })
  @ApiResponse({ status: 200, description: "Agents list returned" })
  findOptions() {
    return this.agentsService.findOptions();
  }

  // Liste complète des agents
  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "List agents with stats (ADMIN/MANAGER)" })
  @ApiResponse({ status: 200, description: "Agents list returned" })
  findAll(@Query() filter: AgentFilterDto) {
    return this.agentsService.findAll(filter);
  }

  // Détails d'un agent
  @Get(":id")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Get agent profile" })
  @ApiResponse({ status: 200, description: "Agent found" })
  findOne(@Param("id") id: string) {
    return this.agentsService.findOne(id);
  }

  // Création d'un compte agent
  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Create agent account (ADMIN/MANAGER)" })
  @ApiResponse({ status: 201, description: "Agent created" })
  create(
    @Body() dto: CreateAgentDto,
    @CurrentUser() user: any,
  ) {
    return this.agentsService.create(dto, toActor(user));
  }

  // Modification du profil agent sans modification du mot de passe
  @Patch(":id")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Update agent profile without password" })
  @ApiResponse({ status: 200, description: "Agent updated" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAgentDto,
    @CurrentUser() user: any,
  ) {
    return this.agentsService.update(id, dto, toActor(user));
  }

  // Activation / désactivation
  @Patch(":id/status")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Activate or deactivate agent" })
  @ApiResponse({ status: 200, description: "Agent status updated" })
  @HttpCode(HttpStatus.OK)
  setStatus(
    @Param("id") id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.agentsService.setStatus(
      id,
      dto.isActive,
      toActor(user),
    );
  }

  // Réinitialisation du mot de passe : MANAGER uniquement
  @Patch(":id/password")
  @Roles(Role.MANAGER)
  @ApiParam({ name: "id" })
  @ApiOperation({
    summary: "Reset agent password (MANAGER only)",
  })
  @ApiResponse({ status: 200, description: "Password reset successfully" })
  @ApiResponse({
    status: 403,
    description: "Only MANAGER can reset passwords",
  })
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Param("id") id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() user: any,
  ) {
    return this.agentsService.resetPassword(
      id,
      dto.password,
      toActor(user),
    );
  }

  // Suppression d'un agent avec transfert du portefeuille
  @Delete(":id")
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: "id" })
  @ApiQuery({
    name: "transferTo",
    required: false,
    description: "Agent qui reprend le portefeuille (défaut : vous)",
  })
  @ApiOperation({
    summary: "Delete agent and transfer portfolio",
  })
  @ApiResponse({
    status: 200,
    description: "Agent deleted and portfolio transferred",
  })
  remove(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Query("transferTo") transferTo?: string,
  ) {
    return this.agentsService.remove(
      id,
      toActor(user),
      transferTo || undefined,
    );
  }

  // Aperçu du portefeuille avant suppression
  @Get(":id/portfolio")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiParam({ name: "id" })
  @ApiOperation({
    summary: "Preview agent portfolio before deletion",
  })
  @ApiResponse({ status: 200, description: "Agent portfolio returned" })
  portfolio(@Param("id") id: string) {
    return this.agentsService.portfolio(id);
  }
}
