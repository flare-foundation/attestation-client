import { AttesterWebOptions } from "../attester/AttesterClientConfiguration";
import { DatabaseConnectOptions } from "../utils/databaseService";
import { AdditionalTypeInfo, IReflection } from "../utils/reflection";

export class SpammerConfig implements IReflection<SpammerConfig> {
  // start epoch in sec
  public firstEpochStartTime = 1636070400;

  // voting round duration in sec
  public roundDurationSec = 90;

  instanciate(): SpammerConfig {
    return new SpammerConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}

export class SpammerCredentials implements IReflection<SpammerCredentials> {
  web = new AttesterWebOptions();
  web2 = new AttesterWebOptions();

  indexerDatabase = new DatabaseConnectOptions();

  instanciate(): SpammerCredentials {
    return new SpammerCredentials();
  }
  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}
