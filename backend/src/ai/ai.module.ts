import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { AiController, PublicAiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { ClaudeService } from "./claude.service";

@Module({
  imports: [NotificationsModule],
  controllers: [AiController, PublicAiController],
  providers: [AiService, ClaudeService],
})
export class AiModule {}
