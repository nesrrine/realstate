import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "../../prisma/prisma.service";
import { JwtPayload } from "../interfaces/jwt-payload.interface";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // getOrThrow : l'application refuse de démarrer sans secret,
      // au lieu de démarrer avec un secret undefined
      secretOrKey: configService.getOrThrow<string>("JWT_SECRET"),
    });
  }

  // Appelée à chaque requête protégée
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        passwordChangedAt: true,
        agent: { select: { id: true } },
      },
    });

    // Compte supprimé ou désactivé : coupure immédiate
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Compte introuvable ou désactivé");
    }

    // Session ouverte avant le dernier changement de mot de passe : révoquée
    if (user.passwordChangedAt) {
      const changedAtSec = Math.floor(user.passwordChangedAt.getTime() / 1000);

      if ((payload.iat ?? 0) < changedAtSec) {
        throw new UnauthorizedException(
          "Session expirée : mot de passe modifié",
        );
      }
    }

    const { passwordChangedAt: _changedAt, agent, ...publicUser } = user;

    // Le rôle vient de la base, pas du token :
    // un changement de rôle s'applique immédiatement
    return {
      ...publicUser,
      userId: user.id, // alias utilisé par toActor (user.id ?? user.userId)
      agentId: agent?.id ?? null,
    };
  }
}