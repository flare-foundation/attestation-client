import { optional } from "@flarenetwork/mcc";
import { DatabaseConnectOptions } from "../utils/databaseService";
import { AdditionalTypeInfo, IReflection } from "../utils/reflection";

/**
 * Class that stores configuration of an attestation client
 */
export class AttesterWebOptions {
  public accountPrivateKey = "";
  public rpcUrl = "";
  public stateConnectorContractAddress = "";
  @optional() public bitVotingContractAddress = "";
  
  @optional() public refreshEventsMs = 100;
}

export class AttesterConfig implements IReflection<AttesterConfig> {

  // start epoch in sec
  public firstEpochStartTime = 1636070400;

  // voting round duration in sec
  public roundDurationSec = 90;

  public dynamicAttestationConfigurationFolder = "./configs/prod/dac/";

  // in sec
  public commitTimeSec = -10;

  // in sec
  public bitVoteTimeSec = -10;

  // additional empty submit at the beginning of commit round to prompt round-2 finalize (should only be done on official AC, it burns additional funds)
  public submitCommitFinalize = false;


  public web = new AttesterWebOptions();
  // public attesterDatabase = new DatabaseConnectOptions();
  // public indexerDatabase = new DatabaseConnectOptions();
  public attesterDatabase = new DatabaseConnectOptions();
  public indexerDatabase = new DatabaseConnectOptions();

  instanciate() {
    return new AttesterConfig();
  }
  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}
