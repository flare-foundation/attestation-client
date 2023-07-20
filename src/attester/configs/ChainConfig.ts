import { MccCreate, optional, RateLimitOptions, UtxoMccCreate, XrpMccCreate } from "@flarenetwork/mcc";
import { AdditionalTypeInfo, IReflection } from "../../utils/reflection/reflection";

/**
 * Chain configuration specification. Used for deserialization when parsing configs from JSON.
 */
export class ChainConfig implements IReflection<ChainConfig> {
  /**
   * Chain name (XRP, BTC, LTC, ALGO, DOGE)
   */
  public name = "";

  /**
   * Configuration for Multi-chain-client.
   * See https://github.com/flare-foundation/multi-chain-client/blob/main/src/index.ts
   * [MCC Create Configuration](./json/json-MCCCreateConfiguration.md)
   */
  public mccCreate: MccCreate;

  /**
   * [Rate Limiting Options](./json/json-RateLimitingOptions.md)
   */
  public rateLimitOptions = new RateLimitOptions();

  /**
   * Number of required block confirmations before block is considered final
   */
  public numberOfConfirmations = 6;

  /**
   * How many blocks are synced in parallel
   */
  @optional() public syncReadAhead = 30;

  /**
   * Block collection mode
   */
  @optional() public blockCollecting: "raw" | "rawUnforkable" | "tips" | "latestBlock" = "raw";

  /**
   * Minimal guaranteed storage of blocks (with confirmed transactions) in number of days. Can be decimal number
   */
  @optional() public minimalStorageHistoryDays = 1;

  /**
   * Minimal guaranteed storage of blocks (with confirmed transactions) in number of blocks.
   */
  @optional() public minimalStorageHistoryBlocks = 1000;

  /**
   * Per chain sync time override. Used if not 0.
   */
  @optional() public syncTimeDays = 0;

  /**
   * Validate block before processing it (used for XRP).
   */
  @optional() public validateBlockBeforeProcess = false;

  /**
   * Wait time in ms before re-validating block.
   */
  @optional() public validateBlockWaitMs = 500;

  /**
   * Number of retries for block to become valid before app restart.
   */
  @optional() public validateBlockMaxRetry = 10;

  instantiate(): ChainConfig {
    return new ChainConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    const cc = obj as ChainConfig;

    if (cc.name === "XRP") {
      info.additionalKeys.set("mccCreate", new XrpMccCreate());
    } else {
      info.additionalKeys.set("mccCreate", new UtxoMccCreate());
    }

    return info;
  }
}
