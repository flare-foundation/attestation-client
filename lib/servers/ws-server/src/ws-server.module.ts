import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../../common/src';
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

function processorProvider() {
  switch (process.env.VERIFIER_TYPE) {
    case "btc":
      return BTCProcessorService;
    case "ltc":
      return LTCProcessorService;
    case "doge":
      return DOGEProcessorService;
    case "xrp":
      return XRPProcessorService;
    case "algo":
      return AlgoProcessorService;
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
      provide: VerifierProcessor,
      useClass: processorProvider()
    },
    WsCommandProcessorService,
    WsServerGateway,
    WsCommandProcessorService
  ],
})
export class WsServerModule { }
