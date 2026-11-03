import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/enums/role.enum";

@ApiTags("Notifications")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "List notifications for current user" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "unreadOnly", required: false, type: Boolean })
  @ApiQuery({ name: "scope", required: false, enum: ["mine", "team"], description: "team : toute l'équipe (gérant/admin, lecture seule)" })
  @ApiQuery({ name: "agentId", required: false })
  findAll(
    @CurrentUser() user: any,
    @Query("limit") limit?: string,
    @Query("unreadOnly") unreadOnly?: string,
    @Query("scope") scope?: string,
    @Query("agentId") agentId?: string,
  ) {
    return this.service.findAll(user, {
      limit: limit ? Number(limit) : undefined,
      unreadOnly: unreadOnly === "true",
      scope: scope === "team" ? "team" : "mine",
      agentId: agentId || undefined,
    });
  }

  @Get("unread-count")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Get unread notification count" })
  getUnreadCount(@CurrentUser() user: any) {
    return this.service.getUnreadCount(user);
  }

  @Patch("mark-all-read")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Mark all notifications as read" })
  markAllAsRead(@CurrentUser() user: any) {
    return this.service.markAllAsRead(user);
  }

  @Patch(":id/read")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Mark a single notification as read" })
  markAsRead(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.markAsRead(id, user);
  }
}
