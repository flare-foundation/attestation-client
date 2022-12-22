import { readSecureConfig, readSecureCredentials } from '../../../../utils/configSecure';
import { WSServerConfiguration, WSServerCredentials } from '../../../common/src/config-models';

export class VerifierConfigurationService {
  wsServerCredentials: WSServerCredentials;
  wsServerConfiguration: WSServerConfiguration;
  verifierType = process.env.VERIFIER_TYPE ? process.env.VERIFIER_TYPE : "vpws";
  _initialized = false;

  constructor() { 
  }
  
  async initialize() {
    if(this._initialized) return;
    this.wsServerCredentials = await readSecureCredentials(new WSServerCredentials(), `verifier-server/${this.verifierType}-verifier`);
    this.wsServerConfiguration = await readSecureConfig(new WSServerConfiguration(), `verifier-server/${this.verifierType}-verifier`);
    this._initialized = true;
  }
}
