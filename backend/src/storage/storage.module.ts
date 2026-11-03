import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { STORAGE_SERVICE } from "./storage.interface";
import { LocalStorageService } from "./local-storage.service";
import { CloudinaryStorageService } from "./cloudinary-storage.service";

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: STORAGE_SERVICE,
      useFactory: (config: ConfigService) => {
        const driver = config.get<string>("STORAGE_DRIVER", "local");
        if (driver === "cloudinary") {
          return new CloudinaryStorageService(config);
        }
        return new LocalStorageService(config);
      },
      inject: [ConfigService],
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
