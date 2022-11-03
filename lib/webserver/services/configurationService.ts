import { toBN } from "@flarenetwork/mcc";
import { Factory, Singleton } from "typescript-ioc";
import { AttesterWebOptions } from "../../attester/AttesterClientConfiguration";
import { readConfig, readCredentials } from "../../utils/config";
import { DatabaseConnectOptions } from "../../utils/databaseService";
import { EpochSettings } from "../../utils/EpochSettings";
import { AdditionalTypeInfo, IReflection } from "../../utils/reflection";
import { ServerConfiguration } from "../configs/ServerConfiguration";

export class ServerCredentials implements IReflection<ServerCredentials> {
  port = 9500;
  web = new AttesterWebOptions();
  attesterDatabase = new DatabaseConnectOptions();

  instanciate(): ServerCredentials {
    return new ServerCredentials();
  }
  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}

@Singleton
@Factory(() => new ConfigurationService())
export class ConfigurationService {
  serverCredentials: ServerCredentials;
  serverConfig: ServerConfiguration;
  epochSettings: EpochSettings;

  constructor() {
    this.serverCredentials = readCredentials(new ServerCredentials(), "backend");
    this.serverConfig = readConfig(new ServerConfiguration(), "backend");
    this.epochSettings = new EpochSettings(toBN(this.serverConfig.firstEpochStartTime), toBN(this.serverConfig.roundDurationSec));
  }
}
