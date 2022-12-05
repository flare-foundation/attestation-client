import { Injectable } from '@nestjs/common';
import { readConfig, readCredentials } from '../../../../utils/config';
import { EpochSettings } from '../../../../utils/EpochSettings';
import { WSServerConfiguration, WSServerCredentials } from '../config-models';

@Injectable()
export class WSServerConfigurationService {
  wsServerCredentials: WSServerCredentials;
  wsServerConfiguration: WSServerConfiguration;
  verifierType = process.env.VERIFIER_TYPE ? process.env.VERIFIER_TYPE : "vpws";

  constructor() {
    this.wsServerCredentials = readCredentials(new WSServerCredentials(), this.verifierType);
    this.wsServerConfiguration = readConfig(new WSServerConfiguration(), this.verifierType);
  }
}
