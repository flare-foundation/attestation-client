import { AttesterCredentials } from "../attester/AttesterConfiguration";
import { DBState } from "../entity/indexer/dbState";
import { readSecureConfig } from "../utils/configSecure";
import { DatabaseService } from "../utils/databaseService";
import { AttLogger } from "../utils/logger";
import { getUnixEpochTimestamp, secToHHMMSS } from "../utils/utils";
import { MonitorBase, MonitorRestartConfig, MonitorStatus } from "./MonitorBase";
import { MonitorConfig } from "./MonitorConfiguration";

export class IndexerMonitor extends MonitorBase {
  static dbService: DatabaseService;

  config: MonitorConfig;

  logger: AttLogger;

  constructor(name: string, logger: AttLogger, config: MonitorConfig) {
    super(name, logger, new MonitorRestartConfig(config.timeRestart, config.indexerRestart.replace("<name>", name).toLowerCase()));

    this.config = config;
    this.logger = logger;
  }

  async initialize() {

    if (!IndexerMonitor.dbService) {
      const credentials = await readSecureConfig(new AttesterCredentials(), "attester");

      IndexerMonitor.dbService = new DatabaseService(this.logger, credentials.indexerDatabase, "indexer");
    }
    await IndexerMonitor.dbService.connect();
  }

  async perf() {
    return null;
  }

  async check(): Promise<MonitorStatus> {
    const res = new MonitorStatus();
    res.type = "indexer";
    res.name = this.name;

    const resState = await IndexerMonitor.dbService.manager.findOne(DBState, { where: { name: `${this.name}_state` } });

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

        if (late > this.config.timeLate) {
          res.status = "late";
        }

        if (late > this.config.timeDown) {
          res.status = "down";
        }
      } else {
        res.comment = "invalid response";
        res.status = "down";
      }
    } else if (resState.valueString == "running") {
      res.comment = `processed blocks ${resState.valueNumber} (late ${late} sec) ${resState.comment}`;
      res.status = "running";

      if (late > this.config.timeLate) {
        res.status = "late";
      }

      if (late > this.config.timeDown) {
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
