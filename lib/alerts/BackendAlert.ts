import { AttLogger } from "../utils/logger";
import { getUnixEpochTimestamp } from "../utils/utils";
import { AlertBase, AlertRestartConfig, AlertStatus } from "./AlertBase";

export class BackendAlert extends AlertBase {

    address: string;

    constructor(name: string, logger: AttLogger, config: AlertRestartConfig, address: string) {
        super(name, logger, config);

        this.address = address;
    }

    async initialize() {
    }

    async checkWebsite(url) {
        var http = require('https');
        
        return new Promise((resolve, reject) => {
            http
                .get(url, function (res) {
                    //console.log(url, res.statusCode);
                    resolve(res.statusCode === 200);
                })
                .on("error", function (e) {
                    resolve(false);
                });
        })
    }

    async check(): Promise<AlertStatus> {

        const res = new AlertStatus();
        res.name = `backend ${this.name}`;

        // check if address exists
        let resExists = await this.checkWebsite(this.address);

        const now = getUnixEpochTimestamp();

        //res.state = "";

        res.timeLate = now;

        if (resExists) {
            res.status = "running";
        }
        else {
            res.status = "down";
            if (await this.restart()) {
                res.comment = "^r^Wrestart^^";
            }
        }

        return res;
    }
}

