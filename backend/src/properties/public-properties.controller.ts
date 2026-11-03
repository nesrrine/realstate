import {
  Controller,
  Get,
  Param,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { PropertiesService } from "./properties.service";
import { PropertyFilterDto } from "./dto/property-filter.dto";
import { Public } from "../common/decorators/public.decorator";

@ApiTags("Public Properties")
@Controller("public/properties")
export class PublicPropertiesController {
  constructor(private propertiesService: PropertiesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "List published properties with pagination, filters and sort (public access)" })
  @ApiResponse({ status: 200, description: "Paginated list of published properties" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "type", required: false, type: String })
  @ApiQuery({ name: "transactionType", required: false, enum: ["SALE", "RENTAL"] })
  @ApiQuery({ name: "city", required: false, type: String })
  @ApiQuery({ name: "district", required: false, type: String })
  @ApiQuery({ name: "priceMin", required: false, type: Number })
  @ApiQuery({ name: "priceMax", required: false, type: Number })
  @ApiQuery({ name: "surfaceMin", required: false, type: Number })
  @ApiQuery({ name: "surfaceMax", required: false, type: Number })
  @ApiQuery({ name: "sortBy", required: false, enum: ["price", "surface", "createdAt", "updatedAt", "title", "reference"] })
  @ApiQuery({ name: "sortOrder", required: false, enum: ["asc", "desc"] })
  findAll(@Query() filter: PropertyFilterDto) {
    return this.propertiesService.findAll(filter, { role: "PUBLIC" });
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get a published property by ID (public access)" })
  @ApiParam({ name: "id", description: "Property CUID" })
  @ApiResponse({ status: 200, description: "Property data" })
  @ApiResponse({ status: 404, description: "Not found" })
  findOne(@Param("id") id: string) {
    return this.propertiesService.findOnePublic(id);
  }
}