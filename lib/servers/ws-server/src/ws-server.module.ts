import { Module } from '@nestjs/common';
import { WsServerGateway } from './ws-server.gateway';
import { WsServerService } from './services/ws-server.service';
import { CommonModule } from '../../common/src';
import { AuthGuard } from './guards/auth.guard';
import { WsCommandProcessorService } from './services/ws-command-processor.service';

@Module({
  imports: [CommonModule],
  controllers: [],
  providers: [WsServerService, WsServerGateway, AuthGuard, WsCommandProcessorService],
})
export class WsServerModule { }
