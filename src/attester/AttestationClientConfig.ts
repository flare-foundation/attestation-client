import { optional } from "@flarenetwork/mcc";
import { DatabaseConnectOptions } from "../utils/databaseService";
import { AdditionalTypeInfo, IReflection } from "../utils/reflection";

/**
 * Blockchain connection configuration class for an attestation client
 */
export class AttesterWebOptions {
  public accountPrivateKey = "";
  public rpcUrl = "";
  public stateConnectorContractAddress = "";
  @optional() public bitVotingContractAddress = "";
  @optional() public gasLimit = "2500000";
  @optional() public gasPrice = "300000000000";  
  @optional() public refreshEventsMs = 100;
}

export class AttestationClientConfig implements IReflection<AttestationClientConfig> {
  public label = "none";

  // start epoch in sec // DEPRECATED should be moved to monitor configs
  public firstEpochStartTime = 1636070400;

  // voting round duration in sec // DEPRECATED should be moved to monitor configs
  public roundDurationSec = 90;

  public dynamicAttestationConfigurationFolder = "./configs/dac/";

  // in sec
  public commitTimeSec = -10;

  // in sec
  public bitVoteTimeSec = -10;

  public forceCloseBitVotingSec = 2;

  // additional empty submit at the beginning of commit round to prompt round-2 finalize (should only be done on official AC, it burns additional funds)
  @optional() public submitCommitFinalize = false;


  public web = new AttesterWebOptions();
  public attesterDatabase = new DatabaseConnectOptions();

  // DEPRECATED should be moved to monitor configs
  public indexerDatabase = new DatabaseConnectOptions();

  instanciate() {
    return new AttestationClientConfig();
  }
  
  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}
