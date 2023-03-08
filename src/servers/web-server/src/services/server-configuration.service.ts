import { toBN } from "@flarenetwork/mcc";
import { readSecureConfig } from "../../../../utils/config/configSecure";
import { EpochSettings } from "../../../../utils/data-structures/EpochSettings";
import { WebserverConfig } from "../config-models/WebserverConfig";

export class ServerConfigurationService {
  serverCredentials: WebserverConfig;
  epochSettings: EpochSettings;
  _initialized = false;
  constructor() {}

  async initialize() {
    if (this._initialized) return;
    this.serverCredentials = await readSecureConfig(new WebserverConfig(), "webserver");
    this.epochSettings = new EpochSettings(toBN(this.serverCredentials.firstEpochStartTime), toBN(this.serverCredentials.roundDurationSec));
    this._initialized = true;
  }
}
