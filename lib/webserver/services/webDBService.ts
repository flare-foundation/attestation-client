import { Factory, Singleton } from "typescript-ioc";
import { DatabaseService } from "../../utils/databaseService";
import { getGlobalLogger } from "../../utils/logger";

@Singleton
@Factory(() => new WebDatabaseService())
export class WebDatabaseService {

   dbService: DatabaseService;

   constructor() {
      this.dbService = new DatabaseService(getGlobalLogger("web"));
   }

   public get connection() {
      return this.dbService.connection;
   }

   public get manager() {
      return this.dbService.manager
   }

   async waitForDBConnection() {
      await this.dbService.waitForDBConnection();
   }
}
