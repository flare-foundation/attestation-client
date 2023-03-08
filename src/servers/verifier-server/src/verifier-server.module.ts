import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { getEntityManagerToken, TypeOrmModule } from "@nestjs/typeorm";
import { EntityManager } from "typeorm";
import { CommonModule } from "../../common/src";
import { HeaderApiKeyStrategy } from "./auth/auth-header-api-key.strategy";
import { IndexerController } from "./controllers/indexer.controller";
import { VerifierController } from "./controllers/verifier.controller";
import { WsServerGateway } from "./gateways/ws-server.gateway";
import { IndexerEngineService } from "./services/indexer-engine.service";
import { VerifierConfigurationService } from "./services/verifier-configuration.service";
import { AlgoProcessorService } from "./services/verifier-processors/algo-processor.service";
import { BTCProcessorService } from "./services/verifier-processors/btc-processor.service";
import { DOGEProcessorService } from "./services/verifier-processors/doge-processor.service";
import { LTCProcessorService } from "./services/verifier-processors/ltc-processor.service";
import { VerifierProcessor } from "./services/verifier-processors/verifier-processor";
import { XRPProcessorService } from "./services/verifier-processors/xrp-processor.service";
import { WsCommandProcessorService } from "./services/ws-command-processor.service";
import { createTypeOrmOptions } from "./utils/db-config";

function processorProvider(config: VerifierConfigurationService, manager: EntityManager): VerifierProcessor {
  switch (process.env.VERIFIER_TYPE) {
    case "btc":
      return new BTCProcessorService(config, manager);
    case "ltc":
      return new LTCProcessorService(config, manager);
    case "doge":
      return new DOGEProcessorService(config, manager);
    case "xrp":
      return new XRPProcessorService(config, manager);
    case "algo":
      return new AlgoProcessorService(config, manager);
    default:
      throw new Error(`Wrong verifier type: '${process.env.VERIFIER_TYPE}'`);
  }
}
@Module({
  imports: [
    CommonModule,
    PassportModule,
    TypeOrmModule.forRootAsync({
      name: "indexerDatabase",
      useFactory: async () => createTypeOrmOptions("web"),
    }),
  ],
  controllers: [VerifierController, IndexerController],
  providers: [
    {
      provide: "VERIFIER_CONFIG",
      useFactory: async () => {
        const config = new VerifierConfigurationService();
        await config.initialize();
        return config;
      },
    },
    {
      provide: "VERIFIER_PROCESSOR",
      useFactory: async (config: VerifierConfigurationService, manager: EntityManager) => processorProvider(config, manager),
      inject: [
        { token: "VERIFIER_CONFIG", optional: false },
        { token: getEntityManagerToken("indexerDatabase"), optional: false },
      ],
    },
    WsCommandProcessorService,
    WsServerGateway,
    WsCommandProcessorService,
    IndexerEngineService,
    HeaderApiKeyStrategy,
  ],
})
export class VerifierServerModule {}
