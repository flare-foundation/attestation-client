import { optional } from "@flarenetwork/mcc";
import { AttesterWebOptions } from "../attester/AttestationClientConfig";
import { DatabaseConnectOptions } from "../utils/databaseService";
import { AdditionalTypeInfo, IReflection } from "../utils/reflection";

export class SpammerCredentials implements IReflection<SpammerCredentials> {

  public firstEpochStartTime = 1636070400;

  // voting round duration in sec
  public roundDurationSec = 90;

  public numberOfConfirmations: number = 6;
  
  web = new AttesterWebOptions();
  @optional() web2 = new AttesterWebOptions();

  indexerDatabase = new DatabaseConnectOptions();

  instanciate(): SpammerCredentials {
    return new SpammerCredentials();
  }
  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}
