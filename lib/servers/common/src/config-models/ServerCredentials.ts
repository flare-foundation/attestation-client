import { AttesterWebOptions } from "../../../../attester/AttesterClientConfiguration";
import { DatabaseConnectOptions } from "../../../../utils/databaseService";
import { AdditionalTypeInfo, IReflection } from "../../../../utils/reflection";

export class ServerCredentials implements IReflection<ServerCredentials> {
   port: number = 9500;
   web = new AttesterWebOptions();
   attesterDatabase = new DatabaseConnectOptions();
   indexerDatabase = new DatabaseConnectOptions();
 
   instanciate(): ServerCredentials {
     return new ServerCredentials();
   }
   getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
     return null;
   }
 }
 