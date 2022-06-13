import { ChainType, MCC } from "@flarenetwork/mcc";
import { Docker, DockerInfo } from "../utils/Docker";
import { getTimeMilli } from "../utils/internetTime";
import { AttLogger } from "../utils/logger";
import { round } from "../utils/utils";
import { AlertBase, AlertRestartConfig, AlertStatus } from "./AlertBase";
import { AlertConfig } from "./AlertsConfiguration";

export class DockerAlert extends AlertBase {
    static dockerInfo: DockerInfo;

    timeCheck = 0;

    chainType: ChainType;

    constructor(name: string, logger: AttLogger, config: AlertConfig) {
        super(name, logger, new AlertRestartConfig(config.timeRestart, config.indexerRestart.replace("<name>", name).toLowerCase()));

        this.chainType = MCC.getChainType(name);
    }

    async initialize() {
        if (!DockerAlert.dockerInfo) {
            DockerAlert.dockerInfo = Docker.getDockerInfo();
        }
    }

    async perf() { return null; }

    async check(): Promise<AlertStatus> {


        const now = getTimeMilli();
        if( now > this.timeCheck ) {
            DockerAlert.dockerInfo = Docker.getDockerInfo();

            // check once per 10 minutes
            this.timeCheck = now + 60 * 10 * 1000;
        }

        const res = new AlertStatus();
        res.name = `docker ${this.name}`;

        const rep = DockerAlert.dockerInfo.repositoryInfo.find( (x)=>x.repository.indexOf( this.name ) > 0 );
        const con = DockerAlert.dockerInfo.containerInfo.find( (x)=>x.image.indexOf( this.name ) > 0 );
        const vol = DockerAlert.dockerInfo.volumeInfo.find( (x)=>x.volume_name.indexOf( this.name ) > 0 );

        if (!rep || !vol || !con ) {
            res.status = "down";
            res.state = "";
            res.comment = `no info`;
            return res;
        }


        res.state = `${con.status}`;
        res.comment = `volume size ${round( vol.size / (1024*1024*1024.0) , 3 ) }GB (rep size ${round( rep.size / (1024*1024*1024.0) , 3 ) }GB)`;

        if (res.state.indexOf( "Up ")===0) {
            res.status = "running";
        }
        else {
            res.status = "down";
        }

        // if (late > this.restartConfig.time) {
        //     if (await this.restart()) {
        //         res.comment = "^r^Wrestart^^";
        //     }
        // }

        return res;
    }
}

