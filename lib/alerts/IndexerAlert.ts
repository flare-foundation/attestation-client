import { AttesterCredentials } from "../attester/AttesterClientConfiguration";
import { DBState } from "../entity/indexer/dbState";
import { readCredentials } from "../utils/config";
import { DatabaseService } from "../utils/databaseService";
import { AttLogger } from "../utils/logger";
import { getUnixEpochTimestamp, secToHHMMSS } from "../utils/utils";
import { AlertBase, AlertRestartConfig, AlertStatus } from "./AlertBase";
import { AlertConfig } from "./AlertsConfiguration";

export class IndexerAlert extends AlertBase {
  static dbService: DatabaseService;

  config: AlertConfig;

  constructor(name: string, logger: AttLogger, config: AlertConfig) {
    super(name, logger, new AlertRestartConfig(config.timeRestart, config.indexerRestart.replace("<name>", name).toLowerCase()));

    this.config = config;

    if (!IndexerAlert.dbService) {
      const credentials = readCredentials(new AttesterCredentials(), "attester");

      IndexerAlert.dbService = new DatabaseService(logger, credentials.indexerDatabase, "indexer");
    }
  }

  async initialize() {
    await IndexerAlert.dbService.waitForDBConnection();
  }

  async perf() {
    return null;
  }

  async check(): Promise<AlertStatus> {
    const res = new AlertStatus();
    res.type = "indexer";
    res.name = this.name;

    const resState = await IndexerAlert.dbService.manager.findOne(DBState, { where: { name: `${this.name}_state` } });

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
