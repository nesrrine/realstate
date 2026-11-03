import { Module } from "@nestjs/common";
import { CashModule } from "../cash/cash.module";
import { ExportsController } from "./exports.controller";
import { ExportsService } from "./exports.service";

@Module({
  imports: [CashModule],
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}
