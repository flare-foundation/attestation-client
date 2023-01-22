import { AttesterWebOptions } from "../attester/AttestationClientConfig";
import { DatabaseConnectOptions } from "../utils/databaseService";
import { AdditionalTypeInfo, IReflection } from "../utils/reflection";

export class SpammerCredentials implements IReflection<SpammerCredentials> {

  public firstEpochStartTime = 1636070400;

  // voting round duration in sec
  public roundDurationSec = 90;

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
