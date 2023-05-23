import { optional } from "@flarenetwork/mcc";
import { AttesterWebOptions } from "../attester/configs/AttesterWebOptions";
import { DatabaseConnectOptions } from "../utils/database/DatabaseConnectOptions";
import { AdditionalTypeInfo, IReflection } from "../utils/reflection/reflection";
import { ChainConfig } from "../attester/configs/ChainConfig";

/**
 * Configurations and credential class for deserialization of JSON configs for spammer.
 * Note: spammer is used only in test environment or to simulate attestation requests.
 */
export class SpammerCredentials implements IReflection<SpammerCredentials> {
  /**
   * Start time of the first epoch in seconds (Unix epoch time). Should match the setting in StateConnector contract
   */
  public firstEpochStartTime = 1636070400;

  /**
   * Voting round duration in seconds.
   */
  public roundDurationSec = 90;

  /**
   * Number of confirmations used with indexer of the database
   */
  public numberOfConfirmations: number = 6;

  /**
   * Flare blockchain connection parameters and credentials
   */
  web = new AttesterWebOptions();

  /**
   * Additional flare blockchain connection and credential parameters for use of the
   * spammer on two blockchains.
   */
  @optional() web2 = new AttesterWebOptions();

  /**
   * Connection parameters and credentials for indexer produced database from which
   * the spammer creates attestation requests.
   */
  indexerDatabase = new DatabaseConnectOptions();

  /**
   * Blockchain configurations options
   */
  @optional() chainConfiguration = new ChainConfig();

  instantiate(): SpammerCredentials {
    return new SpammerCredentials();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}
