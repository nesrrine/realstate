import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { StudioController } from "./studio.controller";
import { StudioService } from "./studio.service";

@Module({
  imports: [PrismaModule],
  controllers: [StudioController],
  providers: [StudioService],
})
export class StudioModule {}