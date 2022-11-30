import { optional } from "@flarenetwork/mcc";
import { DatabaseConnectOptions } from "../utils/databaseService";
import { AdditionalTypeInfo, IReflection } from "../utils/reflection";

/**
 * Class that stores configuration of an attestation client
 */
export class AttesterClientConfiguration implements IReflection<AttesterClientConfiguration> {
  // start epoch in sec
  public firstEpochStartTime = 1636070400;

  // voting round duration in sec
  public roundDurationSec = 90;

  public dynamicAttestationConfigurationFolder = "./configs/prod/dac/";

  // in sec
  public commitTime = 10;

  // additional empty submit at the beggining of commit round to prompt round-2 finalize (should only be done on official AC, it burns additional funds)
  public submitCommitFinalize = false;

  instanciate() {
    return new AttesterClientConfiguration();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}

export class AttesterWebOptions {
  public accountPrivateKey = "";
  public rpcUrl = "";
  public stateConnectorContractAddress = "";

  @optional() public refreshEventsMs = 100;
}

export class AttesterCredentials implements IReflection<AttesterCredentials> {
  public web = new AttesterWebOptions();
  public attesterDatabase = new DatabaseConnectOptions();
  public indexerDatabase = new DatabaseConnectOptions();

  instanciate() {
    return new AttesterCredentials();
  }
  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}
