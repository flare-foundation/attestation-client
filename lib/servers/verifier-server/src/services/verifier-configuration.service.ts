import { readSecureCredentials } from '../../../../utils/configSecure';
import { WSServerCredentials } from '../../../common/src';

export class VerifierConfigurationService {
  wsServerCredentials: WSServerCredentials;
  verifierType = process.env.VERIFIER_TYPE ? process.env.VERIFIER_TYPE : "vpws";
  _initialized = false;

  constructor() {
  }

  async initialize() {
    if (this._initialized) return;
    this.wsServerCredentials = await readSecureCredentials(new WSServerCredentials(), `verifier-server/${this.verifierType}-verifier`);
    this._initialized = true;
  }
}
