import { Module } from '@nestjs/common';
import { ServerConfigurationService } from './services/server-configuration.service';

@Module({
  providers: [ServerConfigurationService],
  exports: [ServerConfigurationService],
})
export class CommonModule { }
