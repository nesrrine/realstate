import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

const SLOW_QUERY_THRESHOLD_MS = 500;

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query' | 'error' | 'warn'>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    // Afficher les erreurs Prisma
    this.$on('error', (event) => {
      this.logger.error(`Prisma error: ${event.message}`);
    });

    // Afficher les avertissements Prisma
    this.$on('warn', (event) => {
      this.logger.warn(event.message);
    });

    // Mesurer les requêtes SQL réellement exécutées
    this.$on('query', (event) => {
      if (event.duration > SLOW_QUERY_THRESHOLD_MS) {
        this.logger.warn(
          `SLOW SQL QUERY (${event.duration}ms): ${event.query}`,
        );
      }
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Connexion PostgreSQL établie avec succès');
    } catch (error) {
      this.logger.error('Impossible de se connecter à PostgreSQL', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Connexion PostgreSQL fermée');
  }
}