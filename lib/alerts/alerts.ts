import { AttestationRoundManager } from "../attester/AttestationRoundManager";
import { AttesterClientConfiguration, AttesterCredentials } from "../attester/AttesterClientConfiguration";
import { DBState } from "../entity/indexer/dbState";
import { IndexerConfiguration } from "../indexer/IndexerConfiguration";
import { readConfig, readCredentials } from "../utils/config";
import { DatabaseService } from "../utils/databaseService";
import { DotEnvExt } from "../utils/DotEnvExt";
import { AttLogger, getGlobalLogger } from "../utils/logger";
import { Terminal1 } from "../utils/terminal";
import { getUnixEpochTimestamp, secToHHMMSS, sleepms } from "../utils/utils";


class AlertConfig {

}

class Status {
    name: string;
    valid: boolean = false;
    state: string = "";
    comment: string = "";
}


class AlertManager {
    logger: AttLogger;
    //config: AlertConfig;
    DAC : AttestationRoundManager;

    constructor() {
        this.logger = getGlobalLogger();

        //this.config = readConfig<AlertConfig>("alert");

        // Reading configuration
        const configIndexer = readConfig<IndexerConfiguration>("indexer");
        const configAttestationClient = readConfig<AttesterClientConfiguration>("attester");
        const attesterCredentials = readCredentials<AttesterCredentials>("attester");

        this.DAC = new AttestationRoundManager(null, configAttestationClient, attesterCredentials, getGlobalLogger(), null);
    }

    async checkIndexer(chain: string): Promise<Status> {

        const res = new Status();
        res.name = `indexer ${chain}`;

        // const resT = await this.dbService.manager.findOne(DBState, { where: { name: `${chain}_T` } });

        // if (resT === undefined) {
        //     res.state = "state data not available";
        //     return res;
        // }

        const resState = await AttestationRoundManager.dbServiceIndexer.manager.findOne(DBState, { where: { name: `${chain}_state` } });

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
        await this.DAC.initialize();

        const terminal = new Terminal1(process.stderr);
        terminal.cursor(false);

        terminal.cursorSave();

        while (true) {

            const chains = ["ALGO", "BTC", "DOGE", "LTC", "XRP"];

            terminal.cursorRestore();

            for (let chain of chains) {
                const res = await this.checkIndexer(chain);

                if (res.valid) {
                    this.logger.info(`${res.name.padEnd(14)} ^g^K VALID ^^   ${res.state.padEnd(10)} ^B${res.comment}`);
                }
                else {
                    this.logger.info(`${res.name.padEnd(14)} ^r^W INVALID ^^ ${res.state.padEnd(10)} ^B${res.comment}`);
                }
            }

            await sleepms(5000);
        }
    }
}


DotEnvExt();

const alertManager = new AlertManager();

alertManager.runAlerts();