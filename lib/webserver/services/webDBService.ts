import { Factory, Inject, Singleton } from "typescript-ioc";
import { DatabaseService } from "../../utils/databaseService";
import { getGlobalLogger } from "../../utils/logger";
import { ConfigurationService } from "./configurationService";

@Singleton
@Factory(() => new WebDatabaseService())
export class WebDatabaseService {
  @Inject
  configurationService: ConfigurationService;

  dbService: DatabaseService;

  constructor() {
    this.dbService = new DatabaseService(getGlobalLogger("web"), this.configurationService.serverCredentials.attesterDatabase, "attester");
  }

  public get manager() {
    return this.dbService.manager;
  }

  async connect() {
    await this.dbService.connect();
  }
}
