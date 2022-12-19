import { Injectable } from '@nestjs/common';
import { readConfig, readCredentials } from '../../../../utils/config';
import { WSServerConfiguration, WSServerCredentials } from '../../../common/src/config-models';

@Injectable()
export class VerifierConfigurationService {
  wsServerCredentials: WSServerCredentials;
  wsServerConfiguration: WSServerConfiguration;
  verifierType = process.env.VERIFIER_TYPE ? process.env.VERIFIER_TYPE : "vpws";

  constructor() {
    this.wsServerCredentials = readCredentials(new WSServerCredentials(), `${this.verifierType}-verifier`);
    this.wsServerConfiguration = readConfig(new WSServerConfiguration(), `${this.verifierType}-verifier`);
  }
}
