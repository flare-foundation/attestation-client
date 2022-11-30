import { Module } from '@nestjs/common';
import { WsServerGateway } from './ws-server.gateway';
import { WsServerService } from './services/ws-server.service';
import { CommonModule } from '../../common/src';
import { AuthGuard } from './guards/auth.guard';
import { WsCommandProcessorService } from './services/ws-command-processor.service';
import { VerifierController } from './controllers/verifier.controller';
import { XRPProcessorService } from './services/xrp-processor';

@Module({
  imports: [CommonModule],
  controllers: [VerifierController],
  providers: [WsServerService, WsServerGateway, AuthGuard, WsCommandProcessorService, XRPProcessorService],
})
export class WsServerModule { }
