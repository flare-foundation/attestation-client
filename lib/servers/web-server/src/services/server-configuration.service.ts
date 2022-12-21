import { toBN } from '@flarenetwork/mcc';
import { readSecureConfig, readSecureCredentials } from '../../../../utils/configSecure';
import { EpochSettings } from '../../../../utils/EpochSettings';
import { ServerConfiguration } from '../../../common/src/config-models/ServerConfiguration';
import { ServerCredentials } from '../../../common/src/config-models/ServerCredentials';

export class ServerConfigurationService {
  serverCredentials: ServerCredentials;
  serverConfig: ServerConfiguration;
  epochSettings: EpochSettings;
  _initialized = false;
  constructor() { }

  async initialize() {
    if(this._initialized) return;
    this.serverCredentials = await readSecureCredentials(new ServerCredentials(), "backend");
    this.serverConfig = await readSecureConfig(new ServerConfiguration(), "backend");
    this.epochSettings = new EpochSettings(toBN(this.serverConfig.firstEpochStartTime), toBN(this.serverConfig.roundDurationSec));
    this._initialized = true;
  }
}
