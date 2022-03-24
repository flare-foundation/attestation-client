import { ChainType, MCC, toBN } from "flare-mcc";
import { ChainManager } from "../chain/ChainManager";
import { ChainNode } from "../chain/ChainNode";
import { DotEnvExt } from "../utils/DotEnvExt";
import { fetchSecret } from "../utils/GoogleSecret";
import { AttLogger, getGlobalLogger, logException } from "../utils/logger";
import { getRandom, getUnixEpochTimestamp, sleepms } from "../utils/utils";
import { Web3BlockCollector } from "../utils/Web3BlockCollector";
import { AttestationType } from "../verification/generated/attestation-types-enum";
import { SourceId } from "../verification/sources/sources";
import { AttestationData } from "./AttestationData";
import { AttestationRoundManager } from "./AttestationRoundManager";
import { AttesterClientConfiguration, AttesterCredentials } from "./AttesterClientConfiguration";
import { AttesterWeb3 } from "./AttesterWeb3";

export class AttesterClient {
  config: AttesterClientConfiguration;
  credentials: AttesterCredentials;
  logger: AttLogger;
  roundMng: AttestationRoundManager;
  attesterWeb3: AttesterWeb3;
  chainManager: ChainManager;
  blockCollector!: Web3BlockCollector;

  constructor(configuration: AttesterClientConfiguration, credentials: AttesterCredentials, logger?: AttLogger) {
    if (logger) {
      this.logger = logger;
    } else {
      this.logger = getGlobalLogger();
    }

    this.config = configuration;
    this.credentials = credentials;
    this.chainManager = new ChainManager(this.logger);
    this.attesterWeb3 = new AttesterWeb3(this.logger, this.config, this.credentials);
    this.roundMng = new AttestationRoundManager(this.chainManager, this.config, this.credentials, this.logger, this.attesterWeb3);
  }

  async start() {
    try {
      const version = "1000";

      this.logger.title(`starting Flare Attester Client v${version}`);

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
      this.logger.info(`chains initialize`);
      await this.initializeChains();

      // connect to network block callback
      this.blockCollector = new Web3BlockCollector(
        this.logger,
        this.credentials.web.rpcUrl,
        this.credentials.web.stateConnectorContractAddress,
        "StateConnector",
        undefined,
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

  async startDisplay() {
    const tty = require("tty");

    if (!tty.WriteStream.isTTY) {
      this.logger.warning(`TTY not supported`);
    }

    while (true) {
      // display
      for (let a = 0; a < 3; a++) {
        let y = a * 4;
        tty.WriteStream.cursorTo(0, y++);
        tty.WriteStream.clearLine(0);

        console.info(`R${100}`);

        tty.WriteStream.cursorTo(0, y++);
        tty.WriteStream.clearLine(0);
        console.info(`Attestations ${100}`);

        tty.WriteStream.cursorTo(0, y++);
        tty.WriteStream.clearLine(0);
        console.info(`Done ${100}`);

        tty.WriteStream.cursorTo(0, y++);
        tty.WriteStream.clearLine(0);
        console.info(`Speed ${100}`);
      }
      await sleepms(1000);
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

    for (const chain of this.config.chains) {
      const chainType = MCC.getChainType(chain.name);

      if (chainType === ChainType.invalid) {
        this.logger.debug(`chain '${chain.name}': undefined chain`);
        continue;
      }

      const node = new ChainNode(this.chainManager, chain.name, chainType, chain);

      this.logger.info(`chain ${chain.name}:#${chainType} '${chain.url}'`);

      // validate this chain node
      if (!(await node.isHealthy())) {
        // this is just a warning since node can be inaccessible at start and will become healthy later on
        this.logger.error(`chain ${chain.name}:#${chainType} is not healthy`);
        continue;
      }

      this.chainManager.addNode(chainType as any as SourceId, node);
    }
  }

  onlyOnce = false;

  processEvent(event: any) {
    if (event.event === "AttestationRequest") {
      const attestation = new AttestationData(event);

      this.roundMng.attestate(attestation);
    }
  }
}
