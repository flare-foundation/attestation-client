import { Module } from '@nestjs/common';
import { getEntityManagerToken, TypeOrmModule } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { CommonModule, WSServerConfigurationService } from '../../common/src';
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

function processorProvider(config: WSServerConfigurationService, manager: EntityManager): VerifierProcessor {
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
      provide: "VERIFIER_PROCESSOR",
      useFactory: async (config: WSServerConfigurationService, manager: EntityManager) => processorProvider(config, manager),
      inject: [WSServerConfigurationService, { token: getEntityManagerToken("indexerDatabase"), optional: false }]
    },
    WsCommandProcessorService,
    WsServerGateway,
    WsCommandProcessorService
  ],
})
export class WsServerModule { }
