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

// Construit l'acteur à partir de req.user (id ou userId selon ta jwt.strategy)
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

  @Get("options")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "List agents for dropdowns" })
  findOptions() {
    return this.agentsService.findOptions();
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "List agents with stats (ADMIN/MANAGER)" })
  findAll(@Query() filter: AgentFilterDto) {
    return this.agentsService.findAll(filter);
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Get agent profile" })
  findOne(@Param("id") id: string) {
    return this.agentsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Create agent account (ADMIN/MANAGER)" })
  @ApiResponse({ status: 201 })
  create(@Body() dto: CreateAgentDto, @CurrentUser() user: any) {
    return this.agentsService.create(dto, toActor(user));
  }

  @Patch(":id")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Update agent profile" })
  update(@Param("id") id: string, @Body() dto: UpdateAgentDto) {
    return this.agentsService.update(id, dto);
  }

  @Patch(":id/status")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Activate or deactivate agent" })
  @HttpCode(HttpStatus.OK)
  setStatus(
    @Param("id") id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.agentsService.setStatus(id, dto.isActive, toActor(user));
  }

  @Patch(":id/password")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Reset agent password" })
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Param("id") id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() user: any,
  ) {
    return this.agentsService.resetPassword(id, dto.password, toActor(user));
  }

  @Delete(":id")
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: "id" })
  @ApiQuery({ name: "transferTo", required: false, description: "Agent qui reprend le portefeuille (défaut : vous)" })
  @ApiOperation({ summary: "Supprimer complètement un agent (portefeuille transféré)" })
  remove(@Param("id") id: string, @CurrentUser() user: any, @Query("transferTo") transferTo?: string) {
    return this.agentsService.remove(id, toActor(user), transferTo || undefined);
  }

  @Get(":id/portfolio")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Ce qui sera transféré si l'agent est supprimé" })
  portfolio(@Param("id") id: string) {
    return this.agentsService.portfolio(id);
  }
}