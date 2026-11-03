import {
  BadRequestException, Body, Controller, Get, HttpException, HttpStatus, Ip, Param, Post, UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { AiService } from "./ai.service";
import {
  PropertyDescriptionDto, PropertyFromTextDto, PublicChatDto, PublicSearchDto, VisitMessageDto, VisitReportDto,
} from "./dto/ai.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Role } from "../common/enums/role.enum";

const ALL = [Role.ADMIN, Role.MANAGER, Role.AGENT];

@ApiTags("AI")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("ai")
export class AiController {
  constructor(private ai: AiService) {}

  @Post("property-description")
  @Roles(...ALL)
  @ApiOperation({ summary: "Rédiger la description d'une annonce" })
  description(@Body() dto: PropertyDescriptionDto) {
    return this.ai.propertyDescription(dto.property, dto.language);
  }

  @Post("property-from-text")
  @Roles(...ALL)
  @ApiOperation({ summary: "Extraire un bien d'un message libre ou d'une note dictée" })
  fromText(@Body() dto: PropertyFromTextDto) {
    return this.ai.propertyFromText(dto.text);
  }

  @Get("match/client/:clientId")
  @Roles(...ALL)
  @ApiParam({ name: "clientId" })
  @ApiOperation({ summary: "Biens recommandés pour un client" })
  matchForClient(@Param("clientId") clientId: string, @CurrentUser() user: any) {
    return this.ai.matchPropertiesForClient(clientId, user);
  }

  @Get("match/property/:propertyId")
  @Roles(...ALL)
  @ApiParam({ name: "propertyId" })
  @ApiOperation({ summary: "Clients intéressés par un bien" })
  matchForProperty(@Param("propertyId") propertyId: string, @CurrentUser() user: any) {
    return this.ai.matchClientsForProperty(propertyId, user);
  }

  @Post("visits/:visitId/message")
  @Roles(...ALL)
  @ApiParam({ name: "visitId" })
  @ApiOperation({ summary: "Message WhatsApp de confirmation de visite" })
  visitMessage(@Param("visitId") visitId: string, @Body() dto: VisitMessageDto) {
    return this.ai.visitConfirmationMessage(visitId, dto.language);
  }

  @Post("visits/:visitId/report")
  @Roles(...ALL)
  @ApiParam({ name: "visitId" })
  @ApiOperation({ summary: "Compte rendu de visite à partir de notes" })
  visitReport(@Param("visitId") visitId: string, @Body() dto: VisitReportDto) {
    return this.ai.visitReport(visitId, dto.notes);
  }

  @Get("price-estimate/:propertyId")
  @Roles(...ALL)
  @ApiParam({ name: "propertyId" })
  @ApiOperation({ summary: "Estimation de prix à partir des comparables" })
  priceEstimate(@Param("propertyId") propertyId: string) {
    return this.ai.priceEstimate(propertyId);
  }
}

// ── Site public (sans connexion, limité par adresse IP) ─────────────────

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 30;
const hits = new Map<string, number[]>();

function rateLimit(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    throw new HttpException("Trop de demandes, réessayez dans quelques minutes.", HttpStatus.TOO_MANY_REQUESTS);
  }
  recent.push(now);
  hits.set(ip, recent);
}

@ApiTags("Public AI")
@Controller("public/ai")
export class PublicAiController {
  constructor(private ai: AiService) {}

  @Post("search")
  @Public()
  @ApiOperation({ summary: "Recherche en langage naturel → filtres" })
  async search(@Body() dto: PublicSearchDto, @Ip() ip: string) {
    rateLimit(ip);
    return { filters: await this.ai.searchFilters(dto.query) };
  }

  @Post("chat")
  @Public()
  @ApiOperation({ summary: "Assistant du site : répond avec les annonces publiées" })
  chat(@Body() dto: PublicChatDto, @Ip() ip: string) {
    rateLimit(ip);
    if (!dto.messages.length || dto.messages[dto.messages.length - 1].role !== "user") {
      throw new BadRequestException("Le dernier message doit venir du visiteur.");
    }
    return this.ai.chat(dto.messages);
  }
}
