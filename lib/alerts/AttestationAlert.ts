import { toBN } from "@flarenetwork/mcc";
import { AttesterClientConfiguration, AttesterCredentials } from "../attester/AttesterClientConfiguration";
import { DBRoundResult } from "../entity/attester/dbRoundResult";
import { readConfig, readCredentials } from "../utils/config";
import { DatabaseService } from "../utils/databaseService";
import { EpochSettings } from "../utils/EpochSettings";
import { AttLogger } from "../utils/logger";
import { AlertBase, AlertRestartConfig, AlertStatus } from "./AlertBase";

export class AttesterAlert extends AlertBase {
    dbService: DatabaseService;
    epochSettings: EpochSettings;

    constructor(name: string, logger: AttLogger, mode: string, path: string, restart: AlertRestartConfig) {
        super(name, logger, restart);

        const credentials = readCredentials(new AttesterCredentials(), "attester", mode, path);
        const config = readConfig(new AttesterClientConfiguration(), "attester", mode, path);

        this.dbService = new DatabaseService(logger, credentials.attesterDatabase, "attester");

        this.epochSettings = new EpochSettings(toBN(config.firstEpochStartTime), toBN(config.roundDurationSec));
    }

    async initialize() {
        await this.dbService.waitForDBConnection();
    }

    async check(): Promise<AlertStatus> {

        const res = new AlertStatus();

        res.name = `attester ${this.name}`;

        //const dbRes = await this.dbService.connection.getRepository(DBVotingRoundResult).find({ order: { roundId: 'DESC' }, take: 1 });
        const dbRes = await this.dbService.connection.getRepository(DBRoundResult).find({ order: { roundId: 'DESC' }, take: 1 });

        let transactions = 0;
        let validTransactions = 0;


        if (dbRes.length === 0) {
            res.state = `unable to get valid result`;
        }
        else
        {
            transactions = dbRes[0].transactionCount;
            validTransactions = dbRes[0].validTransactionCount;
        }

        res.state = `running`;

        const activeRound = this.epochSettings.getCurrentEpochId().toNumber();
        const dbRound = dbRes[0].roundId;

        res.comment = `round ${dbRound} (${activeRound}) transactions ${validTransactions}/${transactions}`;


        res.status = (dbRound + 2) >= activeRound ? "running" : "down";

        // restart if more than 2 round behind
        if (dbRound + 3 < activeRound) {
            if (await this.restart()) {
                res.comment = "^r^Wrestart^^";
            }
        }

        return res;
    }
}

