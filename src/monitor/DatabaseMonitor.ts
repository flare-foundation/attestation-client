import { DatabaseConnectOptions } from "../utils/database/DatabaseConnectOptions";
import { DatabaseService } from "../utils/database/DatabaseService";
import { AttLogger } from "../utils/logging/logger";
import { MonitorBase, PerformanceInfo } from "./MonitorBase";

export class DatabaseMonitor extends MonitorBase {
  dbService: DatabaseService;

  constructor(name: string, logger: AttLogger, databaseName: string, databaseConnectionOptions: DatabaseConnectOptions) {
    super(name, logger, null);

    this.dbService = new DatabaseService(logger, databaseConnectionOptions, databaseName, databaseName + "_process");
  }

  async initialize() {
    await this.dbService.connect();
  }

  async check() {
    return null;
  }

  async perf(): Promise<PerformanceInfo[]> {
    const resArray = [];

    const dbRes = await this.dbService.manager.query(
      "SELECT user, count(*) as conn, sum(time) as time FROM information_schema.processlist where command<>'Sleep' group by user order by time desc;"
    );

    if (dbRes.length === 0) {
    } else {
      for (const user of dbRes) {
        if (user.user === "root" || user.user === "event_scheduler" || user.user === "processReader") continue;

        resArray.push(new PerformanceInfo(`mysql.${user.user}`, "time", user.time, "ms", `${user.conn} connection(s)`));
      }
    }

    return resArray;
  }
}
