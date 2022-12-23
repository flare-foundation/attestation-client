import { toBN } from "@flarenetwork/mcc";
import { AttesterCredentials } from "../attester/AttesterConfiguration";
import { DBRoundResult } from "../entity/attester/dbRoundResult";
import { readSecureCredentials } from "../utils/configSecure";
import { DatabaseService } from "../utils/databaseService";
import { EpochSettings } from "../utils/EpochSettings";
import { AttLogger } from "../utils/logger";
import { AlertBase, AlertRestartConfig, AlertStatus } from "./AlertBase";

export class AttesterAlert extends AlertBase {
  dbService: DatabaseService;
  epochSettings: EpochSettings;

  logger: AttLogger;

  constructor(name: string, logger: AttLogger, mode: string, path: string, restart: AlertRestartConfig) {
    super(name, logger, restart);
    this.logger = logger;
  }

  async initialize() {

    const credentials = await readSecureCredentials(new AttesterCredentials(), "attester");

    this.dbService = new DatabaseService(this.logger, credentials.attesterDatabase, "attester");

    this.epochSettings = new EpochSettings(toBN(credentials.firstEpochStartTime), toBN(credentials.roundDurationSec));
    await this.dbService.connect();
  }

  async perf() {
    return null;
  }

  async check(): Promise<AlertStatus> {
    const res = new AlertStatus();

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
