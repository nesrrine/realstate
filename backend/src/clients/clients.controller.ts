import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse,
} from "@nestjs/swagger";
import { ClientsService } from "./clients.service";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { ClientFilterDto } from "./dto/client-filter.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/enums/role.enum";
import { IsString, IsOptional, IsEnum, IsDateString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { InteractionType, FollowUpStatus } from "@prisma/client";

class ReassignDto { @ApiProperty() @IsString() agentId: string; }

class MergeDto { @ApiProperty() @IsString() targetId: string; }

class CreateInteractionDto {
  @ApiProperty({ enum: InteractionType })
  @IsEnum(InteractionType)
  type: InteractionType;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  body?: string;

  @ApiPropertyOptional({ description: "Date de l'interaction (ISO)" })
  @IsOptional() @IsDateString()
  occurredAt?: string;

  @ApiPropertyOptional({ enum: FollowUpStatus })
  @IsOptional() @IsEnum(FollowUpStatus)
  followUpStatus?: FollowUpStatus;

  @ApiPropertyOptional({ description: "Date de prochaine relance (ISO)" })
  @IsOptional() @IsDateString()
  nextFollowUpAt?: string;
}

class UpdateFollowUpDto {
  @ApiPropertyOptional({ enum: FollowUpStatus })
  @IsOptional() @IsEnum(FollowUpStatus)
  followUpStatus?: FollowUpStatus;

  @ApiPropertyOptional({ description: "Date de prochaine relance (ISO)" })
  @IsOptional() @IsDateString()
  nextFollowUpAt?: string;

  @ApiPropertyOptional({ description: "Date de dernière interaction (ISO)" })
  @IsOptional() @IsDateString()
  lastInteractionAt?: string;
}

@ApiTags("Clients")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("clients")
export class ClientsController {
  constructor(private service: ClientsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "List clients with search, filters, pagination, sort" })
  @ApiResponse({ status: 200, description: "Paginated client list" })
  findAll(@Query() filter: ClientFilterDto, @CurrentUser() user: any) {
    return this.service.findAll(filter, user);
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Get client with leads and visits history" })
  findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Create a new client" })
  @ApiResponse({ status: 201 })
  create(@Body() dto: CreateClientDto, @CurrentUser() user: any) {
    return this.service.create(dto, user);
  }

  @Post("detect-duplicates")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Detect duplicate clients (email/phone) before creation" })
  @ApiResponse({ status: 200, description: "List of similar clients found" })
  detectDuplicates(@Body() dto: CreateClientDto, @CurrentUser() user: any) {
    return this.service.detectDuplicates(dto, user);
  }

  @Put(":id")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Update client (AGENT: own clients only)" })
  update(@Param("id") id: string, @Body() dto: UpdateClientDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user);
  }

  @Patch(":id/convert")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Convert a Prospect to confirmed Client (retains all data)" })
  convert(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.convertToClient(id, user);
  }

  @Patch(":id/reassign")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Reassign client to another agent (ADMIN/MANAGER only)" })
  reassign(@Param("id") id: string, @Body() dto: ReassignDto, @CurrentUser() user: any) {
    return this.service.reassign(id, dto.agentId, user);
  }

  @Post(":id/merge")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Merge a duplicate client into another (ADMIN/MANAGER only)" })
  @ApiResponse({ status: 200, description: "Target client with merged history" })
  merge(@Param("id") id: string, @Body() dto: MergeDto, @CurrentUser() user: any) {
    return this.service.merge(id, dto.targetId, user);
  }

  @Post(":id/interactions")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Add a client interaction (call, message, visit, note, email)" })
  addInteraction(@Param("id") id: string, @Body() dto: CreateInteractionDto, @CurrentUser() user: any) {
    return this.service.createInteraction(id, {
      ...dto,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      nextFollowUpAt: dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : undefined,
    }, user);
  }

  @Patch(":id/follow-up")
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Update client follow-up status and dates" })
  updateFollowUp(@Param("id") id: string, @Body() dto: UpdateFollowUpDto, @CurrentUser() user: any) {
    return this.service.updateFollowUp(id, {
      ...dto,
      nextFollowUpAt: dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : undefined,
      lastInteractionAt: dto.lastInteractionAt ? new Date(dto.lastInteractionAt) : undefined,
    }, user);
  }

  @Delete(":id")
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: "id" })
  @ApiOperation({ summary: "Deactivate client (soft delete)" })
  remove(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user);
  }
}
