import { DatabaseConnectOptions, DatabaseService } from "../utils/databaseService";
import { getTimeMilli } from "../utils/internetTime";
import { AttLogger, logException } from "../utils/logger";
import { round } from "../utils/utils";
import { AlertBase, PerformanceInfo } from "./AlertBase";

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


    cpuUsed = 0;
    cpuTime = 0;

    disks = null;
    diskCheckTime = 0;

    async perf(): Promise<PerformanceInfo[]> {

        const resArray = [];

        const dbRes = await this.dbService.manager.query("SELECT user, count(*) as conn, sum(time) as time FROM information_schema.processlist where command<>'Sleep' group by user order by time desc;");

        if (dbRes.length === 0) {
        }
        else {
            for (var user of dbRes) {

                if (user.user === "root" || user.user === "event_scheduler" || user.user === "processReader") continue;

                resArray.push( new PerformanceInfo( `mysql.${user.user}` , "time" , user.time , "ms" ,`${user.conn} connection(s)` ) );
            }
        }

        var os = require("os");
        var fs = require("fs");

        const now = getTimeMilli();
        const cpus = os.cpus();

        // check free memory
        //const freeMemory = round( os.freemem() / (1024*1024) , 1 );
        // check the total memory
        const totalMemory = round( os.totalmem() / (1024*1024) , 1 );

        const memInfo = fs.readFileSync('/proc/meminfo', 'utf8');
        const availableMemory = round( Number(/MemAvailable:[ ]+(\d+)/.exec(memInfo)[1]) / 1024 , 1 );
        const freeMemory = round( Number(/MemFree:[ ]+(\d+)/.exec(memInfo)[1]) / 1024 , 1 );

        resArray.push( new PerformanceInfo(`system.memory`, "total", totalMemory , "MB" ) );

        resArray.push( new PerformanceInfo(`system.memory`, "free", freeMemory, "MB" , `${round(freeMemory*100/totalMemory,1)}% free` ) );

        resArray.push( new PerformanceInfo(`system.memory`, "available", availableMemory, "MB", `${round(availableMemory*100/totalMemory,1)}% available` ) );

        const nodeDiskInfo = require('node-disk-info');
        // async way
        if( now > this.diskCheckTime ) {
            nodeDiskInfo.getDiskInfo()
                .then(disks => {
                    this.disks = disks;

                    // check once per 10 minutes
                    this.diskCheckTime = now + 60 * 10 * 1000;
                })
                .catch(error => { logException( error , `nodeDiskInfo` );});        
            }

        if( this.disks ) {
            for( let disk of this.disks ) {
                if( disk.mounted!=="/" ) continue;

                resArray.push( new PerformanceInfo( `system.disk.available`, disk.filesystem, 
                    round( disk.available / (1024 * 1024 ) , 3 ), "GB" ,
                    `${round(disk.available*100/(disk.available+disk.used),1)}% of ${round((disk.available+disk.used)/(1024*1024),3)} GB available` ) );
            }
        }

        let used = 0;

        for (let i = 0; i < cpus.length; i++) {
            const cpu = cpus[i];

            //idle+=cpu.times.idle;
            used += cpu.times.sys + cpu.times.user;
        }

        used /= cpus.length;

        resArray.push( new PerformanceInfo( `system.cpu`, "count" , cpus.length, "" , cpus[0].model ) );

        if (this.cpuTime > 0) {
            resArray.push( new PerformanceInfo( `system.cpu` , "utilization" , round((used - this.cpuUsed) * 100 / (now - this.cpuTime), 1) , "%" ) );
        }

        this.cpuTime = now;
        this.cpuUsed = used;

        return resArray;
    }
}

