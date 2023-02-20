import { optional } from "@flarenetwork/mcc";
import { DatabaseConnectOptions } from "../../../../utils/database/DatabaseConnectOptions";
import { AdditionalTypeInfo, IReflection } from "../../../../utils/reflection/reflection";

export class WebserverConfig implements IReflection<WebserverConfig> {

  public firstEpochStartTime: number = 1636070400;

  // voting round duration in sec
  public roundDurationSec: number = 90;

  // path to service status file on server
  @optional() public serviceStatusFilePath: string = "";
  
   port: number = 9500;

   attesterDatabase = new DatabaseConnectOptions();
 
   instanciate(): WebserverConfig {
     return new WebserverConfig();
   }
   getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
     return null;
   }
 }
 