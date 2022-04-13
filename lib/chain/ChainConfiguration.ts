import { AlgoMccCreate, MccCreate, optional, RateLimitOptions, UtxoMccCreate, XrpMccCreate } from "flare-mcc";
import { AdditionalTypeInfo, IReflection } from "../utils/typeReflection";

export class ChainConfiguration implements IReflection<ChainsConfiguration>{

  public name: string = "";

  public mccCreate: MccCreate;
  public rateLimitOptions = new RateLimitOptions();

  public numberOfConfirmations: number = 6;

  @optional() public syncReadAhead: number = 30;

  public blockCollecting: "raw" | "rawUnforkable" | "tips" = "raw";

  @optional() public minimalStorageHistoryDays: number = 1;
  @optional() public minimalStorageHistoryBlocks: number = 1000;

  @optional() public maxValidIndexerDelaySec: number = 10;
  @optional() public maxRequestsPerSecond: number = 10;
  @optional() public maxProcessingTransactions: number = 10;

  @optional() public reverificationTimeOffset: number = 10;

  @optional() public maxFailedRetry: number = 1;
  @optional() public delayBeforeRetry: number = 10;

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