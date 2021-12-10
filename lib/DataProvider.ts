import * as fs from 'fs';
import { Logger } from 'winston';
import yargs from 'yargs';
import { ChainManager } from './ChainManager';
import { ChainNode } from './ChainNode';
import { DataProviderConfiguration } from './DataProviderConfiguration';
import { DotEnvExt } from './DotEnvExt';
import { fetchSecret } from './GoogleSecret';
import { getInternetTime } from './internetTime';
import { ChainType, MCCNodeSettings } from './MCC/MCClientSettings';
import { getLogger } from './utils';
import { Web3BlockCollector } from './Web3BlockCollector';
import { Web3BlockSubscription } from './Web3BlockSubscription';

// Args parsing
const args = yargs.option('config', {
    alias: 'c',
    type: 'string',
    description: 'Path to config json file',
    default: './config.json',
    demand: true
}).argv;

class DataProvider {
    conf: DataProviderConfiguration;
    logger: Logger = getLogger();

    chainManager: ChainManager;
    blockSubscription!: Web3BlockSubscription;
    blockCollector!: Web3BlockCollector;

    constructor(configuration: DataProviderConfiguration) {
        this.conf = configuration;
        this.chainManager = new ChainManager(this.logger);
    }

    async start() {
        const version = "1000";
        this.logger.info(`Starting Flare Attester Client v${version}`)

        // process configuration
        await this.initializeConfiguration();

        // initialize time and local time difference
        const times = await getInternetTime();
        this.logger.info(` * Internet time sync ${times[0] - times[1]}s`);

        // validate configuration chains and create nodes
        await this.initializeChains();

        // connect to network block subscription
        this.blockSubscription = new Web3BlockSubscription(this.logger, this.conf.wsUrl)

        // connect to network block callback
        this.blockCollector = new Web3BlockCollector(this.blockSubscription, this.conf.rpcUrl,
            this.conf.priceSubmitterContractAddress, "PriceSubmitter",
            undefined, (event: any) => { this.processEvent(event) })

        // process chain transaction testing
        this.chainManager.startProcessing();
    }

    async initializeConfiguration() {
        // read .env
        DotEnvExt();

        const configData: string = ""
        let accountPrivateKey: string = ""

        this.logger.info(` * Configuration`)


        if (process.env.PROJECT_SECRET === undefined) {
            this.logger.info(`   * Account read from .env`)
            accountPrivateKey = (this.conf.accountPrivateKey as string)
        } else if (process.env.USE_GCP_SECRET) {
            this.logger.info(`   * Account read from secret`)
            accountPrivateKey = (await fetchSecret(process.env.PROJECT_SECRET as string) as string)
        } else {
            this.logger.info(`   * Account read from config`)
            accountPrivateKey = (this.conf.accountPrivateKey as string)
        }

        // rpcUrl from conf
        if (process.env.RPC_URL !== undefined) {
            this.conf.rpcUrl = process.env.RPC_URL

            // rpcUrl from .env if it exsists
            this.logger.info(`   * Network RPC URL from .env '${this.conf.rpcUrl}'`)
        }
        else {
            this.logger.info(`   * Network RPC URL from conf '${this.conf.rpcUrl}'`)
        }

        if (accountPrivateKey === "" || accountPrivateKey === undefined) {
            this.logger.info(`   ! ERROR: private key not set`)
        }
    }

    async initializeChains() {
        this.logger.info(" * Initializing chains");

        for (const chain of this.conf.chains) {

            const chainType = MCCNodeSettings.getChainType(chain.name);

            if (chainType === ChainType.invalid) {
                this.logger.error(`   # '${chain.name}': undefined chain`);
                continue;
            }

            const node = new ChainNode(this.chainManager, chain.name, chainType, chain.url, chain.username, chain.password, chain.metaData, chain.maxRequestsPerSecond, chain.maxProcessingTransactions);

            this.logger.info(`    * ${chain.name}:#${chainType} '${chain.url}'`);

            // validate this chain node
            if (!await node.isHealthy()) {
                // this is just a warning since node can be inaccessible at start and will become healthy later on
                this.logger.info(`      ! chain ${chain.name}:#${chainType} is not healthy`);
                continue;
            }

            this.chainManager.nodes.set(chainType, node);
        }
    }

    processEvent(event: any) {

        if (event.event === "AttestationRequest") {

            // AttestationRequest
            // // instructions: (uint64 chainId, uint64 blockHeight, uint16 utxo, bool full)
            // // The variable 'full' defines whether to provide the complete transaction details
            // // in the attestation response

            // event AttestationRequest(
            //     uint256 timestamp,
            //     uint256 instructions,
            //     bytes32 txId
            // );

            // todo: parse event
            const timestamp: string = event.returnValues.timestamp;
            const instruction: string = event.returnValues.instruction;
            const txId: string = event.returnValues.txId;

            const chainId: number = 0;

            const blockHeight: number = 0; // uint64
            const utxo: number = 0; // uint16
            const full: boolean = true; // bool

            // also needed
            // -

            this.chainManager.validateTransaction(ChainType.XRP, 10, 0, "0x8263876238946932874689236", null);
        }
    }
}

// Reading configuration
// const conf: DataProviderConfiguration = JSON.parse( fs.readFileSync( (args as any).config ).toString() ) as DataProviderConfiguration;
const conf: DataProviderConfiguration = JSON.parse(fs.readFileSync("configs/config.json").toString()) as DataProviderConfiguration;

const dataProvider = new DataProvider(conf);

dataProvider.start();
