import { optional } from "@flarenetwork/mcc";
import { DatabaseConnectOptions } from "../utils/databaseService";
import { AdditionalTypeInfo, IReflection } from "../utils/reflection";

export class IndexerConfiguration implements IReflection<IndexerConfiguration> {
  @optional() public syncEnabled = true;
  @optional() public syncTimeDays = 2;
  @optional() public blockCollectTimeMs = 1000;

  @optional() public syncUpdateTimeMs = 10000;

  instanciate(): IndexerConfiguration {
    return new IndexerConfiguration();
  }
  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}

export class IndexerCredentials implements IReflection<IndexerCredentials> {
  indexerDatabase = new DatabaseConnectOptions();

  instanciate() {
    return new IndexerCredentials();
  }
  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}
