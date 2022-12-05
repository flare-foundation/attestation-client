import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../../common/src';
import { VerifierController } from './controllers/verifier.controller';
import { AuthGuard } from './guards/auth.guard';
import { AlgoProcessorService } from './services/verifier-processors/algo-processor.service';
import { BTCProcessorService } from './services/verifier-processors/btc-processor.service';
import { DOGEProcessorService } from './services/verifier-processors/doge-processor.service';
import { LTCProcessorService } from './services/verifier-processors/ltc-processor.service';
import { XRPProcessorService } from './services/verifier-processors/xrp-processor.service';
import { WsCommandProcessorService } from './services/ws-command-processor.service';
import { createTypeOrmOptions } from './utils/db-config';
import { WsServerGateway } from './ws-server.gateway';

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
    WsServerGateway, AuthGuard, WsCommandProcessorService, 
    XRPProcessorService, AlgoProcessorService, BTCProcessorService, LTCProcessorService, DOGEProcessorService
  ],
})
export class WsServerModule { }
