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
  UseInterceptors,
  UploadedFile,
  Res,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { PropertiesService } from "./properties.service";
import { CreatePropertyDto } from "./dto/create-property.dto";
import { UpdatePropertyDto } from "./dto/update-property.dto";
import { PropertyFilterDto } from "./dto/property-filter.dto";
import { CreatePropertyDocumentDto } from "./dto/create-property-document.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/enums/role.enum";
import { StreamableFile } from "@nestjs/common";
import { Response } from "express";

@ApiTags("Properties")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard)
@Controller("properties")
export class PropertiesController {
  constructor(private propertiesService: PropertiesService) {}

  // ── GET /properties ──────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: "List properties with pagination, filters and sort" })
  @ApiResponse({ status: 200, description: "Paginated list of properties" })
  findAll(
    @Query() filter: PropertyFilterDto,
    @CurrentUser() user: any,
  ) {
    return this.propertiesService.findAll(filter, user);
  }

  // ── GET /properties/:id ──────────────────────────────────────────
  @Get(":id")
  @ApiOperation({ summary: "Get a property by ID" })
  @ApiParam({ name: "id", description: "Property CUID" })
  @ApiResponse({ status: 200, description: "Property data" })
  @ApiResponse({ status: 404, description: "Not found" })
  findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.propertiesService.findOne(id, user);
  }

  // ── POST /properties ─────────────────────────────────────────────
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Create a new property" })
  @ApiResponse({ status: 201, description: "Property created" })
  create(
    @Body() dto: CreatePropertyDto,
    @CurrentUser() user: any,
  ) {
    return this.propertiesService.create(dto, user);
  }

  // ── PUT /properties/:id ──────────────────────────────────────────
  @Put(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Update a property" })
  @ApiParam({ name: "id", description: "Property CUID" })
  @ApiResponse({ status: 200, description: "Property updated" })
  @ApiResponse({ status: 403, description: "Forbidden - Agents can only update their own" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdatePropertyDto,
    @CurrentUser() user: any,
  ) {
    return this.propertiesService.update(id, dto, user);
  }

  // ── DELETE /properties/:id ───────────────────────────────────────
  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a property (ADMIN/MANAGER only)" })
  @ApiParam({ name: "id", description: "Property CUID" })
  @ApiResponse({ status: 200, description: "Deleted" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  remove(@Param("id") id: string, @CurrentUser() user: any) {
    return this.propertiesService.remove(id, user);
  }

  // ── POST /properties/:id/documents ───────────────────────────────
  @Post(":id/documents")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload a document for a property" })
  @ApiParam({ name: "id", description: "Property CUID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        title: { type: "string" },
        description: { type: "string" },
        category: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 201, description: "Document uploaded" })
  @ApiResponse({ status: 403, description: "Forbidden - Agents can only upload to their own properties" })
  @UseInterceptors(FileInterceptor("file"))
  uploadDocument(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreatePropertyDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.propertiesService.addDocument(id, file, dto, user);
  }

  // ── DELETE /properties/:id/documents/:documentId ─────────────────
  @Delete(":id/documents/:documentId")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a property document" })
  @ApiParam({ name: "id", description: "Property CUID" })
  @ApiParam({ name: "documentId", description: "Document CUID" })
  @ApiResponse({ status: 200, description: "Document deleted" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  removeDocument(
    @Param("id") id: string,
    @Param("documentId") documentId: string,
    @CurrentUser() user: any,
  ) {
    return this.propertiesService.removeDocument(id, documentId, user);
  }

  // ── GET /properties/:id/documents/:documentId/download ───────────────
  @Get(":id/documents/:documentId/download")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Download a single property document" })
  @ApiParam({ name: "id", description: "Property CUID" })
  @ApiParam({ name: "documentId", description: "Document CUID" })
  @ApiResponse({ status: 200, description: "Document file stream" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Document not found" })
  async downloadDocument(
    @Param("id") id: string,
    @Param("documentId") documentId: string,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, filename, contentType } = await this.propertiesService.downloadDocument(
      id,
      documentId,
      user,
    );

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    return new StreamableFile(stream);
  }

  // ── GET /properties/:id/documents/download-zip ──────────────────────
  @Get(":id/documents/download-zip")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Download all property documents as a ZIP file" })
  @ApiParam({ name: "id", description: "Property CUID" })
  @ApiResponse({ status: 200, description: "ZIP file with all documents" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "No documents found" })
  async downloadDocumentsZip(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const zipBuffer = await this.propertiesService.downloadDocumentsZip(id, user);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="property-${id}-documents.zip"`,
    });

    return new StreamableFile(zipBuffer);
  }
}