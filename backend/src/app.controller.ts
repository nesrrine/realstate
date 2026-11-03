import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { AppService } from "./app.service";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { Roles } from "./common/decorators/roles.decorator";
import { Role } from "./common/enums/role.enum";
import { CurrentUser } from "./common/decorators/current-user.decorator";

@ApiTags("App")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("health")
  @ApiOperation({ summary: "Health check" })
  getHealth() {
    return this.appService.getHealth();
  }

  @Get("admin-only")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "ADMIN only route" })
  @ApiResponse({ status: 200, description: "Admin access granted" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  adminOnly(@CurrentUser() user: any) {
    return { message: "Welcome Admin", user };
  }

  @Get("manager-up")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "ADMIN and MANAGER route" })
  managerUp(@CurrentUser() user: any) {
    return { message: "Welcome Manager or Admin", user };
  }

  @Get("agent-up")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "All authenticated roles" })
  agentUp(@CurrentUser() user: any) {
    return { message: "Welcome authenticated user", user };
  }
}
