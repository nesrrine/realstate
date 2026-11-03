import { BadRequestException, Controller, Get, Param, Query, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/enums/role.enum";
import { EXPORT_TYPES, ExportsService, type ExportType } from "./exports.service";

@ApiTags("Exports")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("exports")
export class ExportsController {
  constructor(private exports: ExportsService) {}

  @Get(":type")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiParam({ name: "type", enum: EXPORT_TYPES })
  @ApiQuery({ name: "from", required: false, description: "AAAA-MM-JJ (visites, frais, transactions)" })
  @ApiQuery({ name: "to", required: false, description: "AAAA-MM-JJ" })
  @ApiOperation({ summary: "Export Excel (.xlsx) selon les droits de l'utilisateur" })
  async export(
    @Param("type") type: string,
    @CurrentUser() user: any,
    @Res() res: Response,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    if (!(EXPORT_TYPES as readonly string[]).includes(type)) {
      throw new BadRequestException(`Export inconnu : ${type}`);
    }
    const { buffer, filename } = await this.exports.export(type as ExportType, user, from || undefined, to || undefined);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.send(buffer);
  }
}
