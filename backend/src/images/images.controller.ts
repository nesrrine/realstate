import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { Response } from "express";
import { FilesInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { memoryStorage } from "multer";
import { ImagesService } from "./images.service";
import { ReorderImagesDto } from "./dto/reorder-images.dto";
import { UpdateImageDto } from "./dto/update-image.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/enums/role.enum";

@ApiTags("Property Images")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard)
@Controller("properties/:propertyId/images")
export class ImagesController {
  constructor(private imagesService: ImagesService) {}

  // ── GET /properties/:propertyId/images ───────────────────────────
  @Get()
  @ApiOperation({ summary: "List all images of a property" })
  @ApiParam({ name: "propertyId" })
  findAll(
    @Param("propertyId") propertyId: string,
    @CurrentUser() user: any,
  ) {
    return this.imagesService.findAll(propertyId, user);
  }

  // ── GET /properties/:propertyId/images/download-zip ──────────────
  @Get("download-zip")
  @ApiOperation({ summary: "Download all property images as a ZIP file" })
  @ApiParam({ name: "propertyId" })
  @ApiResponse({ status: 200, description: "ZIP file with all images" })
  async downloadZip(
    @Param("propertyId") propertyId: string,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const zipBuffer = await this.imagesService.downloadZip(propertyId, user);
    
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="property-${propertyId}-images.zip"`,
    });
    
    return new StreamableFile(zipBuffer);
  }

  // ── POST /properties/:propertyId/images/upload ───────────────────
  @Post("upload")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
   @UseInterceptors(
    FilesInterceptor("files", 10, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024, files: 10 }, // refusé avant d'être chargé en mémoire
    }),
  )
  @ApiOperation({ summary: "Upload 1-10 images for a property" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: { type: "string", format: "binary" },
        },
      },
    },
  })
  @ApiParam({ name: "propertyId" })
  @ApiResponse({ status: 201, description: "Images uploaded" })
  uploadMany(
    @Param("propertyId") propertyId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: any,
  ) {
    return this.imagesService.uploadMany(propertyId, files, user);
  }

  // ── PATCH /properties/:propertyId/images/reorder ─────────────────
  @Patch("reorder")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Reorder images (first ID becomes cover)" })
  @ApiParam({ name: "propertyId" })
  reorder(
    @Param("propertyId") propertyId: string,
    @Body() dto: ReorderImagesDto,
    @CurrentUser() user: any,
  ) {
    return this.imagesService.reorder(propertyId, dto, user);
  }

  // ── PATCH /properties/:propertyId/images/:imageId ────────────────
  @Patch(":imageId")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Update image metadata (altText, isCover, order)" })
  @ApiParam({ name: "propertyId" })
  @ApiParam({ name: "imageId" })
  update(
    @Param("propertyId") propertyId: string,
    @Param("imageId") imageId: string,
    @Body() dto: UpdateImageDto,
    @CurrentUser() user: any,
  ) {
    return this.imagesService.update(propertyId, imageId, dto, user);
  }

  // ── PATCH /properties/:propertyId/images/:imageId/cover ──────────
  @Patch(":imageId/cover")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @ApiOperation({ summary: "Set an image as the cover photo" })
  @ApiParam({ name: "propertyId" })
  @ApiParam({ name: "imageId" })
  @ApiResponse({ status: 200, description: "Cover updated, returns all images" })
  setCover(
    @Param("propertyId") propertyId: string,
    @Param("imageId") imageId: string,
    @CurrentUser() user: any,
  ) {
    return this.imagesService.setCover(propertyId, imageId, user);
  }

  // ── DELETE /properties/:propertyId/images/:imageId ───────────────
  @Delete(":imageId")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete an image" })
  @ApiParam({ name: "propertyId" })
  @ApiParam({ name: "imageId" })
  @ApiResponse({ status: 200, description: "Deleted" })
  remove(
    @Param("propertyId") propertyId: string,
    @Param("imageId") imageId: string,
    @CurrentUser() user: any,
  ) {
    return this.imagesService.remove(propertyId, imageId, user);
  }
}
