import { Factory, Singleton } from "typescript-ioc";
import { AttesterWebOptions } from "../../attester/AttesterClientConfiguration";
import { readCredentials } from "../../utils/config";
import { DatabaseConnectOptions } from "../../utils/databaseService";
import { AdditionalTypeInfo, IReflection } from "../../utils/typeReflection";


export class ServerCredentials implements IReflection<ServerCredentials> {
   port: number = 9500;
   web = new AttesterWebOptions();
   attesterDatabase = new DatabaseConnectOptions();

   instanciate(): ServerCredentials {
      return new ServerCredentials();
   }
   getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
      return null;
   }

};


@Singleton
@Factory(() => new ConfigurationService())
export class ConfigurationService {

   serverCredentials: ServerCredentials;

   constructor() {
      this.serverCredentials = readCredentials(new ServerCredentials(), "backend");
   }

}
