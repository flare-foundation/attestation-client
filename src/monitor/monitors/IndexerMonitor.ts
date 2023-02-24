import { DBState } from "../../entity/indexer/dbState";
import { DatabaseService } from "../../utils/database/DatabaseService";
import { getUnixEpochTimestamp, secToHHMMSS } from "../../utils/helpers/utils";
import { AttLogger } from "../../utils/logging/logger";
import { MonitorBase, MonitorStatus } from "../MonitorBase";
import { MonitorConfig } from "../MonitorConfiguration";
import { MonitorConfigBase } from "../MonitorConfigBase";

export class MonitorIndexerConfig extends MonitorConfigBase {
  database = "";

  getName(){return "IndexerMonitor";}

  createMonitor(config: MonitorConfigBase, baseConfig: MonitorConfig, logger: AttLogger) {
    return new IndexerMonitor(<MonitorIndexerConfig>config, baseConfig, logger);
  }
}

export class IndexerMonitor extends MonitorBase<MonitorIndexerConfig> {
  dbService: DatabaseService;

  statusError: string;

  async initialize() {
    const dbConfig = this.baseConfig.databases.find(x => x.name == this.config.database);

    if (!dbConfig) {
      this.statusError = `database '${this.config.database}' not found')`;
      return;
    }

    try {
      this.dbService = new DatabaseService(this.logger, dbConfig.connection, `indexer`, `${this.name}-indexer`);

      await this.dbService.connect();
    }
    catch (error) {
      this.statusError = error.message;
    }
  }

  async perf() {
    return null;
  }

  async check(): Promise<MonitorStatus> {
    const res = new MonitorStatus();
    res.type = "indexer";
    res.name = this.name;

    if (this.statusError) {
      res.state = this.statusError;
      return res;
    }

    const resState = await this.dbService.manager.findOne(DBState, { where: { name: `${this.name}_state` } });

    if (!resState || !resState.valueString) {
      res.state = "state data not available";
      return res;
    }

    const now = getUnixEpochTimestamp();

    res.state = resState.valueString;
    const late = now - resState.timestamp;

    res.timeLate = late;
    res.comment = resState.comment;

    if (resState.valueString == "sync") {
      if (resState.valueNumber > 0) {
        res.comment = `ETA ${secToHHMMSS(resState.valueNumber)}`;
        res.status = "sync";

        if (late > this.baseConfig.timeLate) {
          res.status = "late";
        }

        if (late > this.baseConfig.timeDown) {
          res.status = "down";
        }
      } else {
        res.comment = "invalid response";
        res.status = "down";
      }
    } else if (resState.valueString == "running") {
      res.comment = `processed blocks ${resState.valueNumber} (late ${late} sec) ${resState.comment}`;
      res.status = "running";

      if (late > this.baseConfig.timeLate) {
        res.status = "late";
      }

      if (late > this.baseConfig.timeDown) {
        res.status = "down";
      }
    } else if (resState.valueString == "running-sync") {
      res.comment = `processed blocks ${resState.valueNumber} ${resState.comment}`;
      res.status = "sync";
    }

    if (late > this.restartConfig.time) {
      if (await this.restart()) {
        res.comment = "^r^Wrestart^^";
      }
    }

    return res;
  }
}
