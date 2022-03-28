import { AttesterCredentials } from "../attester/AttesterClientConfiguration";
import { DBState } from "../entity/indexer/dbState";
import { readConfig, readCredentials } from "../utils/config";
import { DatabaseService } from "../utils/databaseService";
import { DotEnvExt } from "../utils/DotEnvExt";
import { AttLogger, getGlobalLogger } from "../utils/logger";
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
    config: AlertConfig;
    dbService: DatabaseService;

    constructor() {
        this.logger = getGlobalLogger();

        this.config = readConfig<AlertConfig>("alert");
        const attesterCredentials = readCredentials<AttesterCredentials>("attester");

        this.dbService = new DatabaseService(this.logger, attesterCredentials.indexerDatabase, "indexer");
    }

    async checkIndexer(chain: string): Promise<Status> {

        const res = new Status();
        res.name = chain;

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

        res.state = resState.name;
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

        while (true) {

            const chains = ["XRP"];

            for(let chain of chains ) {
                const res = await this.checkIndexer(chain);

                if( res.valid ) {
                    this.logger.info( `${res.name} ^gVALID^^   ${res.comment}` );
                }
                else {
                    this.logger.info( `${res.name} ^rINVALID^^ ${res.comment}` );
                }
            }

            await sleepms(5000);
        }
    }
}


DotEnvExt();

const alertManager = new AlertManager();

alertManager.runAlerts();