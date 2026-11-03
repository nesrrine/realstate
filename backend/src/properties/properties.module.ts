import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { memoryStorage } from "multer";
import { PropertiesService } from "./properties.service";
import { PropertiesController } from "./properties.controller";
import { PublicPropertiesController } from "./public-properties.controller";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [
    ConfigModule,
    StorageModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: memoryStorage(),
        limits: {
          fileSize: (config.get<number>("MAX_FILE_SIZE") ?? 50) * 1024 * 1024, // 50 Mo par défaut
        },
        fileFilter: (_req, file, cb) => {
          const allowedMimes = [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/zip",
            "application/x-zip-compressed",
          ];
          if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new Error("Type de fichier non supporté"), false);
          }
        },
      }),
    }),
  ],
  controllers: [PropertiesController, PublicPropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}