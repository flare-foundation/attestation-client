import { AttLogger } from "../utils/logger";
import { getUnixEpochTimestamp } from "../utils/utils";

export class AlertStatus {
    name: string;
    status: "down" | "late" | "sync" | "running" = "down";
    state: string = "";
    comment: string = "";
    timeLate: number;
    displayStatus(logger: AttLogger) {

        let color = "";
        switch (this.status) {
            case "down": color = "^r^W"; break;
            case "late": color = "^b^W"; break;
            case "sync": color = "^y^K"; break;
            case "running": color = "^g^K"; break;
        }
        logger.info(`${this.name.padEnd(20)}  ${color} ${this.status.padEnd(10)} ^^  ${this.state.padEnd(10)} ^B${this.comment}                  `);
    }
}


export class AlertRestartConfig {
    time: number;
    command: string;

    constructor(time: number, command: string) {
        this.time = time;
        this.command = command;
    }
}


const MIN_RESTART_TIME = 60;


export class AlertBase {

    restartConfig: AlertRestartConfig;

    logger: AttLogger;

    name: string;
    timeLastRestart: number = 0;

    constructor(name: string, logger: AttLogger, restart: AlertRestartConfig) {
        this.name = name;
        this.logger = logger;
        this.restartConfig = restart;
    }

    async initialize?();

    async check?(): Promise<AlertStatus>;
    async restart(): Promise<boolean> {
        // do not restart MIN_RESTART_TIME sec after if was just restarted
        const now = getUnixEpochTimestamp();
        if (now - this.timeLastRestart < MIN_RESTART_TIME) return false;

        this.timeLastRestart = now;

        //this.logger.error2( `restarting ${this.name}` );

        // todo: perform command to restart

        return true;
    }
}