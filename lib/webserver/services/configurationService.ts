import { Factory, Singleton } from "typescript-ioc";
import { AttesterWebOptions } from "../../attester/AttesterClientConfiguration";
import { readCredentials } from "../../utils/config";
import { DatabaseConnectOptions } from "../../utils/databaseService";
import { getGlobalLogger } from "../../utils/logger";


export class ServerCredentials {
   port: number;
   web: AttesterWebOptions;
   attesterDatabase: DatabaseConnectOptions;
};


@Singleton
@Factory(() => new ConfigurationService())
export class ConfigurationService {

   serverCredentials: ServerCredentials;

   constructor() {
      this.serverCredentials = readCredentials<ServerCredentials>("backend");
   }

}
