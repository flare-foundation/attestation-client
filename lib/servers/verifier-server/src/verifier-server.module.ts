import { Module } from '@nestjs/common';
import { getEntityManagerToken, TypeOrmModule } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { CommonModule } from '../../common/src';
import { VerifierConfigurationService } from './services/verifier-configuration.service';
import { VerifierController } from './controllers/verifier.controller';
import { AlgoProcessorService } from './services/verifier-processors/algo-processor.service';
import { BTCProcessorService } from './services/verifier-processors/btc-processor.service';
import { DOGEProcessorService } from './services/verifier-processors/doge-processor.service';
import { LTCProcessorService } from './services/verifier-processors/ltc-processor.service';
import { VerifierProcessor } from './services/verifier-processors/verifier-processor';
import { XRPProcessorService } from './services/verifier-processors/xrp-processor.service';
import { WsCommandProcessorService } from './services/ws-command-processor.service';
import { createTypeOrmOptions } from './utils/db-config';
import { WsServerGateway } from './ws-server.gateway';

function processorProvider(config: VerifierConfigurationService, manager: EntityManager): VerifierProcessor {
  switch (process.env.VERIFIER_TYPE) {
    case "btc":
      return new BTCProcessorService(config, manager)
    case "ltc":
      return new LTCProcessorService(config, manager);
    case "doge":
      return new DOGEProcessorService(config, manager);
    case "xrp":
      return new XRPProcessorService(config, manager);
    case "algo":
      return new AlgoProcessorService(config, manager);
    default:
      throw new Error(`Wrong verifier type: '${process.env.VERIFIER_TYPE}'`)
  }
}
@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forRootAsync({
      name: "indexerDatabase",
      useFactory: async () => createTypeOrmOptions("indexerDatabase", "web"),
    }),
  ],
  controllers: [VerifierController],
  providers: [
    {
      provide: 'VERIFIER_CONFIG',
      useFactory: async () => {
        const config = new VerifierConfigurationService();
        await config.initialize()
        return config;
      }
    },
    {
      provide: "VERIFIER_PROCESSOR",
      useFactory: async (config: VerifierConfigurationService, manager: EntityManager) => processorProvider(config, manager),
      inject: [
        { token: "VERIFIER_CONFIG", optional: false },
        { token: getEntityManagerToken("indexerDatabase"), optional: false }
      ]
    },
    WsCommandProcessorService,
    WsServerGateway,
    WsCommandProcessorService
  ],
})
export class VerifierServerModule { }
