import { MccCreate, RateLimitOptions } from "flare-mcc";
import { DatabaseConnectOptions } from "../utils/databaseService";

export class IndexerClientChain {
  public name!: string;

  public mccCreate: MccCreate
  public rateLimitOptions: RateLimitOptions;

  public numberOfConfirmations: number = 6;

  public syncReadAhead: number = 30;

  public blockCollecting: "raw" | "rawUnforkable" | "tips";

  public interlaceTimeRange: number;
  public interlaceBlockRange: number;
}

export class IndexerConfiguration {

  public syncEnabled: boolean = true;
  public syncTimeDays: number = 1;
  public blockCollectTimeMs: number = 1000;

  public syncUpdateTimeMs: number = 10000;

  public chains: IndexerClientChain[] = [];
}

export class IndexerCredentials {
  indexerDatabase: DatabaseConnectOptions;

}