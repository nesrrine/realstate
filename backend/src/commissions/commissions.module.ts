import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CommissionsService } from "./commissions.service";
import { CommissionsController } from "./commissions.controller";
import { CommissionConfigService } from "./commission-config.service";

@Module({
  imports: [ConfigModule],
  controllers: [CommissionsController],
  providers: [CommissionsService, CommissionConfigService],
  exports: [CommissionsService, CommissionConfigService],
})
export class CommissionsModule {}
