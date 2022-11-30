import { AlgoMccCreate, MccCreate, optional, RateLimitOptions, UtxoMccCreate, XrpMccCreate } from "@flarenetwork/mcc";
import { AdditionalTypeInfo, IReflection } from "../utils/reflection";

export class ChainConfiguration implements IReflection<ChainsConfiguration> {
  public name = "";

  public mccCreate: MccCreate;
  public rateLimitOptions = new RateLimitOptions();

  public numberOfConfirmations = 6;

  @optional() public syncReadAhead = 30;

  @optional() public blockCollecting: "raw" | "rawUnforkable" | "tips" | "latestBlock" = "raw";

  @optional() public minimalStorageHistoryDays = 1;
  @optional() public minimalStorageHistoryBlocks = 1000;

  @optional() public maxValidIndexerDelaySec = 10;
  @optional() public maxRequestsPerSecond = 10;
  @optional() public maxProcessingTransactions = 10;

  @optional() public reverificationTimeOffset = 10;

  @optional() public maxFailedRetry = 1;
  @optional() public delayBeforeRetry = 10;

  @optional() public syncTimeDays = 0;

  @optional() public validateBlockBeforeProcess = false;
  @optional() public validateBlockWaitMs = 500;
  @optional() public validateBlockMaxRetry = 10;
  
  instanciate(): ChainsConfiguration {
    return new ChainsConfiguration();
  }
  
  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    //info.additionalKeys.set( "mccCreate" , new MccCreateDummy() );
    //info.additionalKeys.set( "rateLimitOptions" , new RateLimitOptionsDummy() );

    const cc = obj as ChainConfiguration;

    if (cc.name === "XRP") {
      info.additionalKeys.set("mccCreate", new XrpMccCreate());
    } else if (cc.name === "ALGO") {
      info.additionalKeys.set("mccCreate", new AlgoMccCreate());
    } else {
      info.additionalKeys.set("mccCreate", new UtxoMccCreate());
    }

    return info;
  }
}

export class ChainsConfiguration implements IReflection<ChainsConfiguration> {
  public chains: ChainConfiguration[] = [];

  instanciate() {
    return new ChainsConfiguration();
  }
  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    info.arrayMap.set("chains", new ChainConfiguration());

    return info;
  }
}
