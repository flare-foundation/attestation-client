import { optional } from "@flarenetwork/mcc";
import { DatabaseConnectOptions } from "../utils/databaseService";
import { AdditionalTypeInfo, IReflection } from "../utils/typeReflection";

export class IndexerConfiguration implements IReflection<IndexerConfiguration> {

  @optional() public syncEnabled: boolean = true;
  @optional() public syncTimeDays: number = 2;
  @optional() public blockCollectTimeMs: number = 1000;

  @optional() public syncUpdateTimeMs: number = 10000;

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