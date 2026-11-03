import { Module } from "@nestjs/common";
import { TransactionsService } from "./transactions.service";
import { TransactionsController } from "./transactions.controller";
import { CommissionsModule } from "../commissions/commissions.module";

import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [CommissionsModule, NotificationsModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
