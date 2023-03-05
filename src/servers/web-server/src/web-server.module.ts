import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { attesterEntities } from "../../../utils/database/databaseEntities";
import { CommonModule } from "../../common/src";
import { ProofController } from "./controllers/proof.controller";
import { StatusController } from "./controllers/status.controller";
import { ProofEngineService } from "./services/proof-engine.service";
import { ServerConfigurationService } from "./services/server-configuration.service";
import { createTypeOrmOptions } from "./utils/db-config";

@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forRootAsync({
      name: "attesterDatabase",
      useFactory: async () => createTypeOrmOptions("web", attesterEntities()),
    }),
  ],
  controllers: [ProofController, StatusController],
  providers: [
    {
      provide: "SERVER_CONFIG",
      useFactory: async () => {
        const config = new ServerConfigurationService();
        await config.initialize();
        return config;
      },
    },
    ProofEngineService,
  ],
})
export class WebServerModule {}
