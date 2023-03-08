import { MonitorConfig } from "../../../../monitor/MonitorConfiguration";
import { readSecureConfig } from "../../../../utils/config/configSecure";

export class ServerConfigurationService {
  serverCredentials: MonitorConfig;
  _initialized = false;

  constructor() {}

  async initialize() {
    if (this._initialized) return;
    this.serverCredentials = await readSecureConfig(new MonitorConfig(), "monitor");
    this._initialized = true;
  }
}
