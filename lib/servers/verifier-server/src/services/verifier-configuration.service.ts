import { readSecureConfig } from '../../../../utils/configSecure';
import { VerifierServerConfig } from '../../../common/src';

export class VerifierConfigurationService {
  config: VerifierServerConfig;
  verifierType = process.env.VERIFIER_TYPE ? process.env.VERIFIER_TYPE : "vpws";
  _initialized = false;

  constructor() {
  }

  async initialize() {
    if (this._initialized) return;
    this.config = await readSecureConfig(new VerifierServerConfig(), `verifier-server/${this.verifierType}-verifier`);
    this._initialized = true;
  }
}
