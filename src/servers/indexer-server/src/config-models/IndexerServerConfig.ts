import { optional } from "@flarenetwork/mcc";
import { DatabaseConnectOptions } from "../../../../utils/databaseService";
import { AdditionalTypeInfo, IReflection } from "../../../../utils/reflection";

export class IndexerServerConfig implements IReflection<IndexerServerConfig> {

  public firstEpochStartTime: number = 1636070400;

  // voting round duration in sec
  public roundDurationSec: number = 90;

  // path to service status file on server
  @optional() public serviceStatusFilePath: string = "";

  @optional() public deploymentName: string = "";  
  
   port: number = 9500;

   indexerDatabase = new DatabaseConnectOptions();
 
   instanciate(): IndexerServerConfig {
     return new IndexerServerConfig();
   }
   getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
     return null;
   }
 }
 