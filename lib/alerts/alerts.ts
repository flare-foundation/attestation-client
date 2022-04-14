import { optional } from "flare-mcc";
import { string } from "yargs";
import { readConfig } from "../utils/config";
import { DotEnvExt } from "../utils/DotEnvExt";
import { AttLogger, getGlobalLogger, logException } from "../utils/logger";
import { Terminal } from "../utils/terminal";
import { AdditionalTypeInfo, IReflection } from "../utils/typeReflection";
import { sleepms } from "../utils/utils";
import { AlertBase, AlertRestartConfig } from "./AlertBase";
import { AttesterAlert } from "./AttestationAlert";
import { IndexerAlert } from "./IndexerAlert";


class AlertAttestationConfig {
    name = "";
    @optional() mode = "dev";
    @optional() path: "";
    restart = "";
}


export class AlertConfig implements IReflection<AlertConfig> {
    @optional() interval: number = 5000;

    @optional() timeLate: number = 5;
    @optional() timeDown: number = 10;
    @optional() timeRestart: number = 20;
    stateSaveFilename = "";
    indexerRestart = "";
    indexers = ["ALGO", "BTC", "DOGE", "LTC", "XRP"];
    attesters = [];

    instanciate() {
        return new AlertConfig();
    }

    getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {

        const res = new AdditionalTypeInfo();

        res.arrayMap.set( "indexers" , "string" );
        res.arrayMap.set( "attesters" , new AlertAttestationConfig() );

        return res;        
    }

}

class AlertManager {
    logger: AttLogger;
    config: AlertConfig;

    alerts: AlertBase[] = [];

    constructor() {
        this.logger = getGlobalLogger();

        this.config = readConfig(new AlertConfig(), "alerts");

        for (let indexer of this.config.indexers) {
            this.alerts.push(new IndexerAlert(indexer, this.logger, this.config));
        }

        for (let attester of this.config.attesters) {
            this.alerts.push(new AttesterAlert(attester.name, this.logger, attester.mode, attester.path, new AlertRestartConfig(this.config.timeRestart, attester.restart)));
        }
    }

    async runAlerts() {
        for (let alert of this.alerts) {
            await alert.initialize();
        }

        const terminal = new Terminal(process.stderr);
        //terminal.cursor(false);

        this.logger.info(`^e^K${"name".padEnd(20)}  ${"status".padEnd(10)}    ${"message".padEnd(10)} comment                        `);

        terminal.cursorSave();

        while (true) {

            terminal.cursorRestore();

            const status = [];

            for (let alert of this.alerts) {
                const res = await alert.check();

                status.push(res);

                res.displayStatus(this.logger);
            }

            if (this.config.stateSaveFilename) {
                try {
                    var fs = require('fs');
                    fs.writeFile(this.config.stateSaveFilename, JSON.stringify(status), function (err) {
                        if (err) {
                            this.logger.error(err);
                        }
                    });
                }
                catch (error) {
                    logException(`save state`, error);
                }
            }

            await sleepms(this.config.interval);
        }
    }
}


DotEnvExt();

const alertManager = new AlertManager();

alertManager.runAlerts();