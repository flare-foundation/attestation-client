import { toBN } from "flare-mcc";
import { AttesterClientConfiguration, AttesterCredentials } from "../attester/AttesterClientConfiguration";
import { DBVotingRoundResult } from "../entity/attester/dbVotingRoundResult";
import { DBState } from "../entity/indexer/dbState";
import { readConfig, readCredentials } from "../utils/config";
import { DatabaseService } from "../utils/databaseService";
import { DotEnvExt } from "../utils/DotEnvExt";
import { EpochSettings } from "../utils/EpochSettings";
import { AttLogger, getGlobalLogger } from "../utils/logger";
import { Terminal } from "../utils/terminal";
import { getUnixEpochTimestamp, secToHHMMSS, sleepms } from "../utils/utils";


class AlertConfig {

}

class Status {
    name: string;
    valid: boolean = false;
    state: string = "";
    comment: string = "";


    displayStatus(logger: AttLogger) {
        if( this.valid ) {
            logger.info(`${this.name.padEnd(20)}  ^g^K VALID ^^  ${this.state.padEnd(10)} ^B${this.comment}                  `);
        }
        else {
            logger.info(`${this.name.padEnd(20)}  ^r^WINVALID^^  ${this.state.padEnd(10)} ^B${this.comment}                  `);
        }
    }
}


class AttesterAlerts {
    name: string;
    dbService: DatabaseService;
    epochSettings: EpochSettings;


    constructor(name: string) {
        this.name = name;
        const credentials = readCredentials<AttesterCredentials>("attester");
        const config = readConfig<AttesterClientConfiguration>("attester");

        this.dbService = new DatabaseService(getGlobalLogger(), credentials.attesterDatabase, "attester");

        this.epochSettings = new EpochSettings(toBN(config.firstEpochStartTime), toBN(config.roundDurationSec));
    }
    async initialize() {
        await this.dbService.waitForDBConnection();
    }


    async checkAttester(): Promise<Status> {

        const res = new Status();

        res.name = `attester ${this.name}`;

        const dbRes = await this.dbService.connection.getRepository(DBVotingRoundResult).find({ order: { roundId: 'DESC' }, take: 1 });

        if (dbRes.length === 0) {
            res.state = `unable to get valid result`;
        }

        res.state = `running`;

        const activeRound = this.epochSettings.getCurrentEpochId().toNumber();
        const dbRound = dbRes[0].roundId;

        res.comment = `round ${dbRound} (${activeRound})`;

        res.valid = (dbRound + 1) >= activeRound;

        return res;
    }
}


class AlertManager {
    logger: AttLogger;
    //config: AlertConfig;
    dbService: DatabaseService;

    attesters: AttesterAlerts[] = [];

    constructor() {
        this.logger = getGlobalLogger();

        //this.config = readConfig<AlertConfig>("alert");
        const credentials = readCredentials<AttesterCredentials>("attester");

        this.dbService = new DatabaseService(this.logger, credentials.indexerDatabase, "indexer");


        this.attesters.push(new AttesterAlerts("coston"));
    }

    async checkIndexer(chain: string): Promise<Status> {

        const res = new Status();
        res.name = `indexer ${chain}`;

        // const resT = await this.dbService.manager.findOne(DBState, { where: { name: `${chain}_T` } });

        // if (resT === undefined) {
        //     res.state = "state data not available";
        //     return res;
        // }

        const resState = await this.dbService.manager.findOne(DBState, { where: { name: `${chain}_state` } });

        if (resState === undefined) {
            res.state = "state data not available";
            return res;
        }

        const now = getUnixEpochTimestamp();

        res.state = resState.valueString;
        res.valid = resState.timestamp > now - 10;

        if (resState.valueString == "sync") {
            res.comment = `ETA ${secToHHMMSS(resState.valueNumber)}`;
        }
        else if (resState.valueString == "running") {
            res.comment = `processed blocks ${resState.valueNumber}`;
        }

        return res;
    }


    async runAlerts() {

        await this.dbService.waitForDBConnection();

        const terminal = new Terminal(process.stderr);
        terminal.cursor(false);

        terminal.cursorSave();

        while (true) {

            const chains = ["ALGO", "BTC", "DOGE", "LTC", "XRP"];

            terminal.cursorRestore();

            for (let chain of chains) {
                const res = await this.checkIndexer(chain);

                res.displayStatus( this.logger );
            }

            for( let attester of this.attesters ) {
                const res = await attester.checkAttester();

                res.displayStatus( this.logger );
            }

            await sleepms(5000);
        }
    }
}


DotEnvExt();

const alertManager = new AlertManager();

alertManager.runAlerts();