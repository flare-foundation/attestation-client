import { MccCreate, RateLimitOptions } from "flare-mcc";

export class IndexerClientChain {
  public name!: string;

  public mccCreate: MccCreate
  public rateLimitOptions: RateLimitOptions;
  
  public confirmationsCollect: number = 6;

  public syncReadAhead: number = 30;
}

export class IndexerConfiguration {

  public syncEnabled: boolean = true;
  public syncTimeDays: number = 1;
  public blockCollectTimeMs: number = 1000;

  public chains: IndexerClientChain[] = [];
}
