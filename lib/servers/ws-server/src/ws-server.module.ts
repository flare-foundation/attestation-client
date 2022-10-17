import { Module } from '@nestjs/common';
import { WsServerGateway } from './ws-server.gateway';
import { WsServerService } from './services/ws-server.service';
import { CommonModule } from '../../common/src';

@Module({
  imports: [CommonModule],
  controllers: [],
  providers: [WsServerService, WsServerGateway],
})
export class WsServerModule { }
