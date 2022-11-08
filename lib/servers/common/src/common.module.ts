import { Module } from '@nestjs/common';
import { ServerConfigurationService } from './services/server-configuration.service';
import { WSServerConfigurationService } from './services/ws-server-configuration.service';

@Module({
  providers: [ServerConfigurationService, WSServerConfigurationService],
  exports: [ServerConfigurationService, WSServerConfigurationService],
})
export class CommonModule { }
