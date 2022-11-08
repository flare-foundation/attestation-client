import { Injectable } from '@nestjs/common';
import { readConfig, readCredentials } from '../../../../utils/config';
import { WSServerConfiguration, WSServerCredentials } from '../config-models';

@Injectable()
export class WSServerConfigurationService {
  wsServerCredentials: WSServerCredentials;
  wsServerConfiguration: WSServerConfiguration;

  constructor() {
    this.wsServerCredentials = readCredentials(new WSServerCredentials(), "vpws");
    this.wsServerConfiguration = readConfig(new WSServerConfiguration(), "vpws");
  }
}
