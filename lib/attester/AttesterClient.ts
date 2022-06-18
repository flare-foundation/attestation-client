import { ChainType, Managed, MCC, traceManager } from "@flarenetwork/mcc";
import { ChainsConfiguration } from "../chain/ChainConfiguration";
import { ChainManager } from "../chain/ChainManager";
import { ChainNode } from "../chain/ChainNode";
import { DotEnvExt } from "../utils/DotEnvExt";
import { fetchSecret } from "../utils/GoogleSecret";
import { AttLogger, getGlobalLogger, logException } from "../utils/logger";
import { setRetryFailureCallback } from "../utils/PromiseTimeout";
import { secToHHMMSS } from "../utils/utils";
import { Web3BlockCollector } from "../utils/Web3BlockCollector";
import { SourceId } from "../verification/sources/sources";
import { AttestationData } from "./AttestationData";
import { AttestationRoundManager } from "./AttestationRoundManager";
import { AttesterClientConfiguration, AttesterCredentials } from "./AttesterClientConfiguration";
import { AttesterWeb3 } from "./AttesterWeb3";

@Managed()
export class AttesterClient {
  config: AttesterClientConfiguration;
  chainsConfig: ChainsConfiguration;
  credentials: AttesterCredentials;
  logger: AttLogger;
  roundMng: AttestationRoundManager;
  attesterWeb3: AttesterWeb3;
  chainManager: ChainManager;
  blockCollector!: Web3BlockCollector;

  constructor(configuration: AttesterClientConfiguration, credentials: AttesterCredentials, chains: ChainsConfiguration, logger?: AttLogger) {
    if (logger) {
      this.logger = logger;
    } else {
      this.logger = getGlobalLogger();
    }

    this.config = configuration;
    this.chainsConfig = chains;
    this.credentials = credentials;
    this.chainManager = new ChainManager(this.logger);
    this.attesterWeb3 = new AttesterWeb3(this.logger, this.config, this.credentials);
    this.roundMng = new AttestationRoundManager(this.chainManager, this.config, this.credentials, this.logger, this.attesterWeb3);
  }

  localRetryFailure(label: string) {
    getGlobalLogger().error2(`retry failure: ${label} - application exit`);
    process.exit(2);
  }

  async getBlockForTime(time: number) {
    let blockNumber = await this.attesterWeb3.web3Functions.getBlockNumber();

    while (true) {

      let block = await this.attesterWeb3.web3Functions.getBlock(blockNumber);

      if (block.timestamp < time) {
        this.logger.debug2(`start block number ${blockNumber} time ${secToHHMMSS(block.timestamp)}`);
        return blockNumber;
      }

      blockNumber -= 10;
    }
  }

  async start() {
    try {
      const version = "1002";

      traceManager.displayTrace = true;

      this.logger.title(`starting Flare Attester Client v${version}`);

      setRetryFailureCallback(this.localRetryFailure);

      // create state connector
      this.logger.info(`attesterWeb3 initialize`);
      await this.attesterWeb3.initialize();

      // process configuration
      this.logger.info(`configuration initialize`);
      await this.initializeConfiguration();

      this.logger.info(`roundManager initialize`);
      await this.roundMng.initialize();

      // initialize time and local time difference
      //const sync = await getInternetTime();
      //this.logger.info(`internet time sync ${sync}ms`);

      // validate configuration chains and create nodes
      try {
        this.logger.info(`chains initialize`);
        await this.initializeChains();
      }
      catch (error) {
        logException(error, `initializeChains`);
      }

      // get block in curent attestation round
      const startRoundTime = AttestationRoundManager.epochSettings.getRoundIdTimeStartMs(AttestationRoundManager.activeEpochId) / 1000;
      this.logger.debug(`start round ^Y#${AttestationRoundManager.activeEpochId}^^ time ${secToHHMMSS(startRoundTime)}`);
      const startBlock = await this.getBlockForTime(startRoundTime);

      // connect to network block callback
      this.blockCollector = new Web3BlockCollector(
        this.logger,
        this.credentials.web.rpcUrl,
        this.credentials.web.stateConnectorContractAddress,
        "StateConnector",
        startBlock,
        (event: any) => {
          this.processEvent(event);
        }
      );

      //this.startDisplay();
    }
    catch (error) {
      logException(error, `start error: `);
    }
  }

  async initializeConfiguration() {
    // read .env
    DotEnvExt();

    const configData: string = "";
    let accountPrivateKey: string = "";

    this.logger.info(`configuration`);

    if (process.env.PROJECT_SECRET === undefined) {
      this.logger.info(`account read from .env`);
      accountPrivateKey = this.credentials.web.accountPrivateKey as string;
    } else if (process.env.USE_GCP_SECRET) {
      this.logger.info(`^Raccount read from secret`);
      accountPrivateKey = (await fetchSecret(process.env.PROJECT_SECRET as string)) as string;
    } else {
      this.logger.info(`^Gaccount read from config`);
      accountPrivateKey = this.credentials.web.accountPrivateKey as string;
    }

    this.logger.info(`network RPC URL from conf '${this.credentials.web.rpcUrl}'`);

    if (accountPrivateKey === "" || accountPrivateKey === undefined) {
      this.logger.error(`private key not set`);
    }
  }

  async initializeChains() {
    this.logger.info("initializing chains");

    for (const chain of this.chainsConfig.chains) {
      const chainType = MCC.getChainType(chain.name);

      if (chainType === ChainType.invalid) {
        this.logger.debug(`chain '${chain.name}': undefined chain`);
        continue;
      }

      const node = new ChainNode(this.chainManager, chain.name, chainType, chain);

      this.logger.info(`chain ${chain.name}:#${chainType}`);

      this.chainManager.addNode(chainType as any as SourceId, node);
    }
  }

  onlyOnce = false;

  async processEvent(event: any) {
    try {
      if (event.event === "AttestationRequest") {
        const attestation = new AttestationData(event);

        this.roundMng.attestate(attestation);
      }
    } catch (error) {
      logException(error, `processEvent(AttestationRequest)`);
    }

    try {
      if (event.event === "RoundFinalised") {

        const dbState = await AttestationRoundManager.state.getRound(event.returnValues.bufferNumber - 3);
        const commitedRoot = dbState ? dbState.merkleRoot : undefined;

        if (commitedRoot) {
          if (commitedRoot === event.returnValues.merkleHash) {
            this.logger.info(`^e^G^Revent^^^G RoundFinalised ${event.returnValues.bufferNumber} ${event.returnValues.merkleHash} (root as commited)`);
          }
          else {
            this.logger.error(`^e^Revent^^ RoundFinalised ${event.returnValues.bufferNumber} ${event.returnValues.merkleHash} (commited root ${commitedRoot})`);
          }
        }
        else {
          this.logger.error(`^e^Revent^^ RoundFinalised ${event.returnValues.bufferNumber} ${event.returnValues.merkleHash} (root not commited)`);
        }

      }
    } catch (error) {
      logException(error, `processEvent(RoundFinalised)`);
    }
  }
}


// process.on('SIGINT', () => {
//   console.log('Received SIGINT. Press Control-D to exit.');
// });

// // Using a single function to handle multiple signals
// function handle(signal) {
//   console.log(`Received ${signal}`);
// }

// process.on('SIGINT', handle);
// process.on('SIGTERM', handle);
