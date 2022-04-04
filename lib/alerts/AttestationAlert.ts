import { toBN } from "flare-mcc";
import { AttesterClientConfiguration, AttesterCredentials } from "../attester/AttesterClientConfiguration";
import { DBVotingRoundResult } from "../entity/attester/dbVotingRoundResult";
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

        const credentials = readCredentials<AttesterCredentials>("attester", mode, path);
        const config = readConfig<AttesterClientConfiguration>("attester", mode, path);

        this.dbService = new DatabaseService(logger, credentials.attesterDatabase, "attester");

        this.epochSettings = new EpochSettings(toBN(config.firstEpochStartTime), toBN(config.roundDurationSec));
    }

    async initialize() {
        await this.dbService.waitForDBConnection();
    }

    async check(): Promise<AlertStatus> {

        const res = new AlertStatus();

        res.name = `attester ${this.name}`;

        const dbRes = await this.dbService.connection.getRepository(DBVotingRoundResult).find({ order: { roundId: 'DESC' }, take: 1 });

        if (dbRes.length === 0) {
            res.state = `unable to get valid result`;
        }

        res.state = `running`;

        const activeRound = this.epochSettings.getCurrentEpochId().toNumber();
        const dbRound = dbRes[0].roundId;

        res.comment = `round ${dbRound} (${activeRound})`;


        res.status = (dbRound + 1) >= activeRound ? "running" : "down";

        // restart if more than 2 round behind
        if (dbRound + 2 < activeRound) {
            this.restart();
        }

        return res;
    }
}

