import { toBN } from "@flarenetwork/mcc";
import { DBRoundResult } from "../../entity/attester/dbRoundResult";
import { EpochSettings } from "../../utils/data-structures/EpochSettings";
import { DatabaseService } from "../../utils/database/DatabaseService";
import { AttLogger } from "../../utils/logging/logger";
import { MonitorBase, MonitorStatus, PerformanceMetrics } from "../MonitorBase";
import { MonitorConfigBase } from "../MonitorConfigBase";
import { MonitorConfig } from "../MonitorConfiguration";

/**
 * Attestation monitor configuration class
 */
export class MonitorAttestationConfig extends MonitorConfigBase {
  database = "";

  firstEpochStartTime: number;
  roundDurationSec: number;

  getName() {
    return "AttesterMonitor";
  }

  createMonitor(config: MonitorConfigBase, baseConfig: MonitorConfig, logger: AttLogger) {
    return new AttesterMonitor(<MonitorAttestationConfig>config, baseConfig, logger);
  }
}

/**
 * Attester monitor
 */
export class AttesterMonitor extends MonitorBase<MonitorAttestationConfig> {
  dbService: DatabaseService;
  epochSettings: EpochSettings;

  lastState: DBRoundResult[];

  logger: AttLogger;

  statusError: string;

  async initialize() {
    const dbConfig = this.baseConfig.databases.find((x) => x.name == this.config.database);

    if (!dbConfig) {
      this.statusError = `database '${this.config.database}' not found`;
      return;
    }

    try {
      this.dbService = new DatabaseService(this.logger, dbConfig.connection, "attester", `${this.name}-attester`);

      this.epochSettings = new EpochSettings(toBN(this.config.firstEpochStartTime), toBN(this.config.roundDurationSec));
      await this.dbService.connect();

      // clear error
      this.statusError = null;
    } catch (error) {
      this.statusError = error.toString();
    }
  }

  async getPerformanceMetrics() {
    if (!this.lastState) {
      return null;
    }

    const resArray = [];

    const transactions = this.lastState[0].transactionCount;
    const validTransactions = this.lastState[0].validTransactionCount;

    const activeRound = this.epochSettings.getCurrentEpochId().toNumber();
    const dbRound = this.lastState[0].roundId;

    resArray.push(new PerformanceMetrics(`attester.${this.name}`, `collected`, transactions, "tx"));
    resArray.push(new PerformanceMetrics(`attester.${this.name}`, `valid`, validTransactions, "tx"));

    resArray.push(new PerformanceMetrics(`attester.${this.name}`, `active`, activeRound, "round"));
    resArray.push(new PerformanceMetrics(`attester.${this.name}`, `saved`, dbRound, "round"));

    return resArray;
  }

  async getMonitorStatus(): Promise<MonitorStatus> {
    const res = new MonitorStatus();

    res.type = `attestation client`;
    res.name = this.name;

    if (this.statusError) {
      res.state = this.statusError;
      this.lastState = null;

      // try to reconnect
      await this.initialize();

      return res;
    }

    const dbRes = await this.dbService.manager.getRepository(DBRoundResult).find({ order: { roundId: "DESC" }, take: 1 });

    let transactions = 0;
    let validTransactions = 0;

    if (dbRes.length === 0) {
      res.state = `unable to get valid result`;
      return res;
    } else {
      transactions = dbRes[0].transactionCount;
      validTransactions = dbRes[0].validTransactionCount;
    }

    this.lastState = dbRes;

    res.state = `running`;

    const activeRound = this.epochSettings.getCurrentEpochId().toNumber();
    const dbRound = dbRes[0].roundId;

    res.comment = `round ${dbRound} (${activeRound}) transactions ${validTransactions}/${transactions}`;

    res.status = dbRound + 2 >= activeRound ? "running" : "down";

    // restart if more than 2 round behind
    if (dbRound + 3 < activeRound) {
      if (await this.restart()) {
        res.comment = "^r^Wrestart^^";
      }
    }

    return res;
  }
}
