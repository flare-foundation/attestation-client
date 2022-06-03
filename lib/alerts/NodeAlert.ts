import { ChainType, IBlock, ITransaction, MCC } from "@flarenetwork/mcc";
import { CachedMccClient, CachedMccClientOptions } from "../caching/CachedMccClient";
import { ChainConfiguration, ChainsConfiguration } from "../chain/ChainConfiguration";
import { readConfig } from "../utils/config";
import { AttLogger, logException } from "../utils/logger";
import { AlertBase, AlertRestartConfig, AlertStatus } from "./AlertBase";
import { AlertConfig } from "./AlertsConfiguration";

export class NodeAlert extends AlertBase {
    static chainsConfig: ChainsConfiguration;
    chainType: ChainType;

    chainConfig: ChainConfiguration;
    cachedClient: CachedMccClient<any, IBlock>;


    constructor(name: string, logger: AttLogger, config: AlertConfig) {
        super(name, logger, new AlertRestartConfig(config.timeRestart, config.indexerRestart.replace("<name>", name).toLowerCase()));

        if (!NodeAlert.chainsConfig) {
            NodeAlert.chainsConfig = readConfig(new ChainsConfiguration(), "chains");
        }

        this.chainType = MCC.getChainType(name);
        this.chainConfig = NodeAlert.chainsConfig.chains[this.chainType];
    }

    async initialize() {
        // todo: setup options from config
        let cachedMccClientOptions: CachedMccClientOptions = {
            transactionCacheSize: 100000,
            blockCacheSize: 100000,
            cleanupChunkSize: 100,
            activeLimit: 70,
            clientConfig: {
                ...this.chainConfig.mccCreate,
                rateLimitOptions: this.chainConfig.rateLimitOptions,
                loggingOptions: {
                    mode: "production",
                    loggingCallback: this.mccLogging.bind(this),
                    warningCallback: this.mccWarning.bind(this),
                    exceptionCallback: this.mccException.bind(this),
                }
            },
        };

        try {
           this.cachedClient = new CachedMccClient<ITransaction, IBlock>(this.chainType, cachedMccClientOptions);
        }
        catch(error ) {
            logException( error , `node ${this.chainType}` );
        }
    }

    mccLogging(message: string) {
        //this.logger.info(`MCC ${message}`);
      }
    
      mccWarning(message: string) {
        this.logger.warning(`MCC ${message}`);
      }
    
      mccException(error: any, message: string) {
        logException(error, message);
      }
    

    async perf() { return null; }

    async check(): Promise<AlertStatus> {

        const res = new AlertStatus();
        res.name = `node ${this.name}`;

        if( !this.cachedClient ) {
            res.status = "down";
            res.state = "unable to connect";
            res.comment = `${(this.chainConfig.mccCreate as any).url}`;
            return res;
        }

        var status = await this.cachedClient.client.getNodeStatus();

        if (status === undefined) {
            res.state = "node data not available";
            return res;
        }

        res.state = `${status.state} bottom block ${status.bottomBlock}`;
        res.comment = `version ${status.version}`;

        if( status.isHealthy && status.isSynced ) {
            res.status = "running";
        }
        else if( status.isHealthy && !status.isSynced ) {
            res.status = "sync";
        }
        else if( !status.isHealthy ) {
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

