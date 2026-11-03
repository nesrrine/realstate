import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Ip, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { ContactService } from "./contact.service";
import { PublicContactDto } from "./contact.dto";

// Anti-abus : 5 messages par adresse IP toutes les 10 minutes
const WINDOW_MS = 10 * 60 * 1000;
const MAX_MESSAGES = 5;
const hits = new Map<string, number[]>();

function rateLimit(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_MESSAGES) {
    throw new HttpException(
      "Vous avez envoyé plusieurs messages : réessayez dans quelques minutes ou appelez-nous.",
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  recent.push(now);
  hits.set(ip, recent);
}

@ApiTags("Public contact")
@Controller("public")
export class ContactController {
  constructor(private contact: ContactService) {}

  @Get("agency")
  @Public()
  @ApiOperation({ summary: "Coordonnées de l'agence pour le site (nom, adresse, Maps, téléphone)" })
  agency() {
    return this.contact.publicAgency();
  }

  @Post("contact")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Formulaire de contact du site → lead dans le CRM" })
  submit(@Body() dto: PublicContactDto, @Ip() ip: string) {
    rateLimit(ip);
    return this.contact.submit(dto);
  }
}
