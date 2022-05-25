import { DatabaseConnectOptions, DatabaseService } from "../utils/databaseService";
import { getTimeMilli } from "../utils/internetTime";
import { AttLogger } from "../utils/logger";
import { round } from "../utils/utils";
import { AlertBase, PerformanceInfo,  } from "./AlertBase";

export class DatabaseAlert extends AlertBase {
    dbService: DatabaseService;

    constructor(name: string, logger: AttLogger, databaseName: string, databaseConnectionOptions: DatabaseConnectOptions) {
        super(name, logger, null);

        this.dbService = new DatabaseService(logger, databaseConnectionOptions, databaseName, databaseName + "_process");
    }

    async initialize() {
        await this.dbService.waitForDBConnection();
    }

    async check() { return null; }


    cpuUsed=0;
    cpuTime=0;

    async perf(): Promise<PerformanceInfo[]>   {

        const resArray = [];

        const dbRes = await this.dbService.manager.query("SELECT user, count(*) as conn, sum(time) as time FROM information_schema.processlist where command<>'Sleep' group by user order by time desc;");

        if (dbRes.length === 0) {
        }
        else {
            for (var user of dbRes) {

                if (user.user === "root" || user.user === "event_scheduler" || user.user === "processReader") continue;

                const res = new PerformanceInfo();
                res.name = `mysql.${user.user}`;
                res.valueName = "time";
                res.valueUnit = "ms";
                res.value = user.time;
                res.comment = `${user.conn} connection(s)`;

                resArray.push( res );
            }
        }

        var os = require("os");
        const cpus = os.cpus();
        const now = getTimeMilli();

        let used = 0;

        for(let i=0; i<cpus.length; i++) {
            const cpu = cpus[i];

            //idle+=cpu.times.idle;
            used+=cpu.times.sys + cpu.times.user;
        }

        used/=cpus.length;

        let res = new PerformanceInfo();
        res.name = `system.cpu`;
        res.valueName = "count";
        res.value = cpus.length;
        res.comment = cpus[0].model;

        resArray.push( res );


        if( this.cpuTime > 0 ) {
            let res = new PerformanceInfo();
            res.name = `system.cpu`;
            res.valueName = "utilization";
            res.valueUnit = "%";
            res.value = round( (used-this.cpuUsed) * 100 / ( now - this.cpuTime) , 1 );

            resArray.push( res );
        }

        this.cpuTime = now;
        this.cpuUsed=used;

        return resArray;
    }
}

