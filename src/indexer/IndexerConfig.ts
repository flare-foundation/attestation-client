import { optional } from "@flarenetwork/mcc";
import { ChainConfig } from "../attester/configs/ChainConfig";
import { DatabaseConnectOptions } from "../utils/database/DatabaseConnectOptions";
import { AdditionalTypeInfo, IReflection } from "../utils/reflection/reflection";

/**
 * Indexer configuration. Top level JSON deserialization object.
 *
 */
export class IndexerConfig implements IReflection<IndexerConfig> {
  /**
   * Enable chain back syncing
   */
  @optional() public syncEnabled = true;
  /**
   * How many days back to sync (decimals are supported)
   */
  @optional() public syncTimeDays = 2;
  /**
   * How much time in ms to wait before checking for new block
   */
  @optional() public blockCollectTimeMs = 1000;

  /**
   * How much time to wait before checking for a new block while syncing
   */
  @optional() public syncUpdateTimeMs = 10000;

  /**
   * Indexer database configuration connection options
   */
  indexerDatabase = new DatabaseConnectOptions();

  /**
   * Blockchain configurations options
   */
  chainConfiguration = new ChainConfig();

  instantiate() {
    return new IndexerConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}
