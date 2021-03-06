import { optional } from "@flarenetwork/mcc";
import { DatabaseConnectOptions } from "../utils/databaseService";
import { AdditionalTypeInfo, IReflection } from "../utils/typeReflection";

export class AttesterClientConfiguration implements IReflection<AttesterClientConfiguration> {
  // start epoch in sec
  public firstEpochStartTime: number = 1636070400;

  // voting round duration in sec
  public roundDurationSec: number = 90;

  public dynamicAttestationConfigurationFolder: string = "./configs/prod/dac/";

  // in sec
  public commitTime: number = 10;

  // additional empty submit at the beggining of commit round to prompt round-2 finalize (should only be done on official AC, it burns additional funds)
  public submitCommitFinalize: boolean = false;

  instanciate() {
    return new AttesterClientConfiguration();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}

export class AttesterWebOptions {
  public accountPrivateKey: string = "";
  public rpcUrl: string = "";
  public stateConnectorContractAddress: string = "";

  @optional() public useNewStateConnector = false;
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
