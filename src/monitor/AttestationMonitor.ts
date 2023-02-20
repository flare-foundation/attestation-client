import { toBN } from "@flarenetwork/mcc";
import { AttestationClientConfig } from "../attester/configs/AttestationClientConfig";
import { DBRoundResult } from "../entity/attester/dbRoundResult";
import { readSecureConfig } from "../utils/config/configSecure";
import { EpochSettings } from "../utils/data-structures/EpochSettings";
import { DatabaseService } from "../utils/database/DatabaseService";
import { AttLogger } from "../utils/logging/logger";
import { MonitorBase, MonitorRestartConfig, MonitorStatus } from "./MonitorBase";

export class AttesterMonitor extends MonitorBase {
  dbService: DatabaseService;
  epochSettings: EpochSettings;

  logger: AttLogger;

  constructor(name: string, logger: AttLogger, mode: string, path: string, restart: MonitorRestartConfig) {
    super(name, logger, restart);
    this.logger = logger;
  }

  async initialize() {

    const config = await readSecureConfig(new AttestationClientConfig(), "attester");

    this.dbService = new DatabaseService(this.logger, config.attesterDatabase, "attester");

    this.epochSettings = new EpochSettings(toBN(config.firstEpochStartTime), toBN(config.roundDurationSec));
    await this.dbService.connect();
  }

  async perf() {
    return null;
  }

  async check(): Promise<MonitorStatus> {
    const res = new MonitorStatus();

    res.type = `attestation client`;
    res.name = this.name;

    //const dbRes = await this.dbService.manager.getRepository(DBVotingRoundResult).find({ order: { roundId: 'DESC' }, take: 1 });
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
