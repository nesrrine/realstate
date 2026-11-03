import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

type Effort = "low" | "medium" | "high";

/**
 * Accès unique à l'API Claude pour tout le backend.
 * - Modèle : ANTHROPIC_MODEL (par défaut claude-opus-5-5).
 * - Identifiants : ANTHROPIC_API_KEY (ou ANTHROPIC_AUTH_TOKEN), lus par le SDK.
 * - Refus de sécurité : repli serveur automatique (fallbacks: "default").
 */
@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private readonly model = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
  private client: Anthropic | null = null;

  /** Une clé est-elle configurée ? Sinon, le moteur de règles gratuit prend le relais. */
  isConfigured(): boolean {
    return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  }

  private getClient(): Anthropic {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      throw new ServiceUnavailableException(
        "IA non configurée : ajoutez ANTHROPIC_API_KEY dans backend/.env puis redémarrez le serveur.",
      );
    }
    this.client ??= new Anthropic();
    return this.client;
  }

  /** Réponse texte libre (annonce, message, réponse du chat). */
  async text(system: string, user: string, effort: Effort = "low", maxTokens = 4000): Promise<string> {
    const response = await this.call(() =>
      this.getClient().beta.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort },
        system,
        messages: [{ role: "user", content: user }],
      }),
    );
    this.assertNotRefused(response.stop_reason);
    return response.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("")
      .trim();
  }

  /** Réponse structurée validée par un schéma Zod (champs à remplir, classement…). */
  async json<T extends z.ZodType>(
    schema: T,
    system: string,
    user: string,
    effort: Effort = "low",
    maxTokens = 8000,
  ): Promise<z.infer<T>> {
    const response = await this.call(() =>
      this.getClient().beta.messages.parse({
        model: this.model,
        max_tokens: maxTokens,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort, format: betaZodOutputFormat(schema) },
        system,
        messages: [{ role: "user", content: user }],
      }),
    );
    this.assertNotRefused(response.stop_reason);
    if (response.parsed_output == null) {
      throw new BadGatewayException("Réponse de l'IA illisible, réessayez.");
    }
    return response.parsed_output as z.infer<T>;
  }

  private assertNotRefused(stopReason: string | null) {
    if (stopReason === "refusal") {
      throw new BadRequestException("L'IA n'a pas pu traiter cette demande. Reformulez-la.");
    }
    if (stopReason === "max_tokens") {
      throw new BadGatewayException("Réponse de l'IA trop longue, réessayez avec un texte plus court.");
    }
  }

  /** Traduit les erreurs du SDK en erreurs HTTP compréhensibles côté interface. */
  private async call<R>(fn: () => Promise<R>): Promise<R> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
        this.logger.error(`Claude: identifiants refusés (${error.status})`);
        throw new ServiceUnavailableException("Clé API Claude invalide ou sans accès au modèle.");
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new HttpException("L'IA est très sollicitée, réessayez dans un instant.", HttpStatus.TOO_MANY_REQUESTS);
      }
      if (error instanceof Anthropic.BadRequestError) {
        this.logger.error(`Claude: requête refusée - ${error.message}`);
        throw new BadGatewayException("Requête IA refusée par l'API.");
      }
      if (error instanceof Anthropic.APIError) {
        this.logger.error(`Claude: erreur API ${error.status} - ${error.message}`);
        throw new BadGatewayException("Service IA indisponible, réessayez plus tard.");
      }
      if (error instanceof Anthropic.APIConnectionError) {
        throw new BadGatewayException("Impossible de joindre le service IA (connexion).");
      }
      throw error;
    }
  }
}
