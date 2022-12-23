import { toBN } from '@flarenetwork/mcc';
import { readSecureConfig } from '../../../../utils/configSecure';
import { EpochSettings } from '../../../../utils/EpochSettings';
import { WebserverConfig } from '../../../common/src/config-models/WebserverConfig';

export class ServerConfigurationService {
  serverCredentials: WebserverConfig;
  epochSettings: EpochSettings;
  _initialized = false;
  constructor() { }

  async initialize() {
    if(this._initialized) return;
    this.serverCredentials = await readSecureConfig(new WebserverConfig(), "webserver");
    this.epochSettings = new EpochSettings(toBN(this.serverCredentials.firstEpochStartTime), toBN(this.serverCredentials.roundDurationSec));
    this._initialized = true;
  }
}
