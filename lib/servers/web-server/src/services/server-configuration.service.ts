import { toBN } from '@flarenetwork/mcc';
import { readSecureConfig, readSecureCredentials } from '../../../../utils/configSecure';
import { EpochSettings } from '../../../../utils/EpochSettings';
import { ServerCredentials } from '../../../common/src/config-models/ServerCredentials';

export class ServerConfigurationService {
  serverCredentials: ServerCredentials;
  epochSettings: EpochSettings;
  _initialized = false;
  constructor() { }

  async initialize() {
    if(this._initialized) return;
    this.serverCredentials = await readSecureCredentials(new ServerCredentials(), "backend");
    this.epochSettings = new EpochSettings(toBN(this.serverCredentials.firstEpochStartTime), toBN(this.serverCredentials.roundDurationSec));
    this._initialized = true;
  }
}
