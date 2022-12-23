import { optional } from "@flarenetwork/mcc";
import { AttesterWebOptions } from "../../../../attester/AttesterConfig";
import { DatabaseConnectOptions } from "../../../../utils/databaseService";
import { AdditionalTypeInfo, IReflection } from "../../../../utils/reflection";

export class WebserverConfig implements IReflection<WebserverConfig> {

  public firstEpochStartTime: number = 1636070400;

  // voting round duration in sec
  public roundDurationSec: number = 90;

  // path to service status file on server
  @optional() public serviceStatusFilePath: string = "";

  @optional() public deploymentName: string = "";  
  
   port: number = 9500;

   attesterDatabase = new DatabaseConnectOptions();
   indexerDatabase = new DatabaseConnectOptions();
 
   instanciate(): WebserverConfig {
     return new WebserverConfig();
   }
   getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
     return null;
   }
 }
 