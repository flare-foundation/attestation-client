import { optional } from "@flarenetwork/mcc";
import { DatabaseConnectOptions } from "../../utils/database/DatabaseConnectOptions";
import { AdditionalTypeInfo, IReflection } from "../../utils/reflection/reflection";
import { AttesterWebOptions } from "./AttesterWebOptions";

/**
 * Attestation client configuration object. JSON configurations are read directly into this
 * object where existence of the keys is matched to the members in the class.
 */
export class AttestationClientConfig implements IReflection<AttestationClientConfig> {
  /**
   * Label in logs. Useful to mark log entries in case multiple logs are mixed.
   * If set to 'none', the label is empty.
   */
  public label = "none";

  /**
   * First epoch start time in seconds in StateConnector and BitVoting contracts.
   * @deprecated scheduled for deletion as it is read directly from the smart contract upon start
   */
  public firstEpochStartTime = 1636070400;

  /**
   * Voting window duration in seconds in StateConnector and BitVoting contracts.
   * @deprecated scheduled for deletion as it is read directly from the smart contract upon start
   */
  public roundDurationSec = 90;

  /**
   * Path to (dynamic) global configurations folder. It can be described relative to
   * the working directory.
   */
  public globalConfigurationsFolder = "./configs/global-configs/";

  /**
   * Attestation submission time in seconds, relative to the end of the `commit` phase. Usually
   * a negative value.
   */
  public commitTimeSec = -10;

  /**
   * Bit voting time in seconds, relative to the end of the `choose` phase. Usually
   * a negative value.
   */
  public bitVoteTimeSec = -10;

  /**
   * Time to close bit voting round for counting in seconds, relative to the end of the `choose`
   * phase. On chain timestamps for valid bit votes must be within the `choose` phase. Attestation
   * client time and chain time may not be in sync and may be shifted for several seconds since
   * miners can use slightly shifted time. To obtain all the bit votes in `choose` phase one has to be
   * sure that the end time of the `choose` phase on chain has passed, hence a block with strictly
   * later time then the end of the `choose` epoch must be mined. But if there is not enough traffic
   * on the blockchain, this block may appear too late. This setting decides the time when the attestation
   * client forcedly decides that all votes should be available. The setting is relative to the end
   * of the `choose` phase and is usually few seconds.
   */
  public forceCloseBitVotingSec = 2;

  /**
   * Web3 configurations for attestation client.
   */
  public web = new AttesterWebOptions();

  /**
   * Database connection configuration for attestation client
   */
  public attesterDatabase = new DatabaseConnectOptions();

  // DEPRECATED should be moved to monitor configs
  /**
   * Indexer database configuration for attestation client.
   * @deprecated scheduled for deletion as it is not needed
   */
  @optional() public indexerDatabase = new DatabaseConnectOptions();

  instantiate() {
    return new AttestationClientConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}
