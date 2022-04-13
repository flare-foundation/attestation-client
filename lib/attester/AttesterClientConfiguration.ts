import { DatabaseConnectOptions } from "../utils/databaseService";
import { AdditionalTypeInfo, IReflection, reflection } from "../utils/typeReflection";

@reflection()
export class AttesterClientConfiguration implements IReflection<AttesterClientConfiguration>{

  // start epoch in sec
  public firstEpochStartTime: number = 1636070400;

  // voting round duration in sec
  public roundDurationSec: number = 90;

  public dynamicAttestationConfigurationFolder: string = "./configs/prod/dac/";

  // in sec
  public commitTime: number = 10;
  // in sec
  public revealTime: number = 80;

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

}

export class AttesterCredentials implements IReflection<AttesterCredentials>{
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

