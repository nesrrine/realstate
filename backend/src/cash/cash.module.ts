import { Module } from "@nestjs/common";
import { CashService } from "./cash.service";
import { CashController } from "./cash.controller";

@Module({
  controllers: [CashController],
  providers: [CashService],
  // Droits d'accès réutilisés par l'export Excel des frais et dépenses
  exports: [CashService],
})
export class CashModule {}
