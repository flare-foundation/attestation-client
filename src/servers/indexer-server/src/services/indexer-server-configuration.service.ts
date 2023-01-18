import { toBN } from '@flarenetwork/mcc';
import { readSecureConfig } from '../../../../utils/configSecure';
import { EpochSettings } from '../../../../utils/EpochSettings';
import { IndexerServerConfig } from '../config-models/IndexerServerConfig';

export class IndexerServerConfigurationService {
  serverCredentials: IndexerServerConfig;
  epochSettings: EpochSettings;
  _initialized = false;
  indexerType = process.env.INDEXER_TYPE;
  constructor() { 
    if(!this.indexerType) {
      throw new Error("Env variable INDEXER_TYPE must be set.")
    }
  }

  async initialize() {
    if(this._initialized) return;
    this.serverCredentials = await readSecureConfig(new IndexerServerConfig(), `indexer-server/${this.indexerType}-indexer-server`);
    this.epochSettings = new EpochSettings(toBN(this.serverCredentials.firstEpochStartTime), toBN(this.serverCredentials.roundDurationSec));
    this._initialized = true;
  }
}
