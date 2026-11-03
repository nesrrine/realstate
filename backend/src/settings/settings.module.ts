import { Global, Module } from "@nestjs/common";
import { AgencySettingsService } from "./agency-settings.service";
import { SettingsController } from "./settings.controller";

/** Global : les coordonnées de l'agence servent aux messages (IA) et aux frais de visite (caisse). */
@Global()
@Module({
  controllers: [SettingsController],
  providers: [AgencySettingsService],
  exports: [AgencySettingsService],
})
export class SettingsModule {}
