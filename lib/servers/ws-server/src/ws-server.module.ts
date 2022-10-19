import { Module } from '@nestjs/common';
import { WsServerGateway } from './ws-server.gateway';
import { WsServerService } from './services/ws-server.service';
import { CommonModule } from '../../common/src';
import { AuthGuard } from './guards/auth.guard';

@Module({
  imports: [CommonModule],
  controllers: [],
  providers: [WsServerService, WsServerGateway, AuthGuard],
})
export class WsServerModule { }
