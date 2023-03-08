import { optional } from "@flarenetwork/mcc";
import { DatabaseConnectOptions } from "../../utils/database/DatabaseConnectOptions";
import { DatabaseService } from "../../utils/database/DatabaseService";
import { AttLogger } from "../../utils/logging/logger";
import { AdditionalTypeInfo, IReflection } from "../../utils/reflection/reflection";
import { MonitorBase, MonitorStatus, PerformanceInfo } from "../MonitorBase";
import { MonitorConfig } from "../MonitorConfiguration";
import { MonitorConfigBase } from "../MonitorConfigBase";

export class MonitorDatabaseConfig extends MonitorConfigBase implements IReflection<MonitorDatabaseConfig> {
  @optional() database = "attester";
  @optional() monitorPerformance = false;

  connection = new DatabaseConnectOptions();

  instanciate() {
    return new MonitorDatabaseConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }

  getName() {
    return "DatabaseMonitor";
  }

  createMonitor(config: MonitorConfigBase, baseConfig: MonitorConfig, logger: AttLogger) {
    return new DatabaseMonitor(<MonitorDatabaseConfig>config, baseConfig, logger);
  }
}

export class DatabaseMonitor extends MonitorBase<MonitorDatabaseConfig> {
  dbService: DatabaseService;
  logger: AttLogger;

  errorStatus: string;

  async initialize() {
    try {
      this.dbService = new DatabaseService(this.logger, this.config.connection, this.config.database, this.config.database + "_process");
      await this.dbService.connect();
    } catch (error) {
      this.errorStatus = error.message;
      this.logger.exception(error);
    }
  }

  async check() {
    if (this.errorStatus) {
      const res = new MonitorStatus();
      res.type = "database";
      res.name = this.name;
      res.state = this.errorStatus;
      res.status = "down";

      return res;
    }

    return null;
  }

  async perf(): Promise<PerformanceInfo[]> {
    const resArray = [];

    if (this.errorStatus) {
      return null;
    }

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
