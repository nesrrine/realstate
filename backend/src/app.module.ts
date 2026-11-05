import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MulterModule } from "@nestjs/platform-express";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { PropertiesModule } from "./properties/properties.module";
import { ImagesModule } from "./images/images.module";
import { ClientsModule } from "./clients/clients.module";
import { OwnersModule } from "./owners/owners.module";
import { CashModule } from "./cash/cash.module";
import { AiModule } from "./ai/ai.module";
import { SettingsModule } from "./settings/settings.module";
import { LeadsModule } from "./leads/leads.module";
import { VisitsModule } from "./visits/visits.module";
import { TransactionsModule } from "./transactions/transactions.module";
import { CommissionsModule } from "./commissions/commissions.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { AgentsModule } from "./agents/agents.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { ContactModule } from "./contact/contact.module";
import { ExportsModule } from "./exports/exports.module";
import { StudioModule } from "./studio/studio.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env" }),
    MulterModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), "uploads"),
      serveRoot: "/uploads",
      serveStaticOptions: { index: false },
    }),
    PrismaModule,
    AuthModule,
    PropertiesModule,
    ImagesModule,
    ClientsModule,
    OwnersModule,
    CashModule,
    AiModule,
    SettingsModule,
    LeadsModule,
    VisitsModule,
    TransactionsModule,
    CommissionsModule,
    DashboardModule,
    HealthModule,
     AgentsModule,
     NotificationsModule,
    ContactModule,
    ExportsModule,
    StudioModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
