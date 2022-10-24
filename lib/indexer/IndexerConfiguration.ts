import { optional } from "@flarenetwork/mcc";
import { DatabaseConnectOptions } from "../utils/databaseService";
import { AdditionalTypeInfo, IReflection } from "../utils/typeReflection";

export class IndexerConfiguration implements IReflection<IndexerConfiguration> {
  @optional() public syncEnabled: boolean = true;
  @optional() public syncTimeDays: number = 2; //  Default setting for how many days in the past we store data??
  @optional() public blockCollectTimeMs: number = 1000;

  @optional() public syncUpdateTimeMs: number = 10000;

  instanciate(): IndexerConfiguration {
    return new IndexerConfiguration();
  }
  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}

// Self implementing????
export class IndexerCredentials implements IReflection<IndexerCredentials> {
  indexerDatabase = new DatabaseConnectOptions();

  instanciate() {
    return new IndexerCredentials();
  }
  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}
