import BN from "bn.js";
import { ChainType, MCC, toBN } from "flare-mcc";
import { ChainManager } from "../chain/ChainManager";
import { ChainNode } from "../chain/ChainNode";
import { DotEnvExt } from "../utils/DotEnvExt";
import { fetchSecret } from "../utils/GoogleSecret";
import { getInternetTime } from "../utils/internetTime";
import { AttLogger, getGlobalLogger as getGlobalLogger } from "../utils/logger";
import { partBNbe, sleepms } from "../utils/utils";
import { Web3BlockCollector } from "../utils/Web3BlockCollector";
import { AttestationType, ATT_BITS } from "../verification/attestation-types";
import { AttestationData } from "./AttestationData";
import { Attester } from "./Attester";
import { AttesterClientConfiguration } from "./AttesterClientConfiguration";
import { AttesterWeb3 } from "./AttesterWeb3";

export class AttesterClient {
  conf: AttesterClientConfiguration;
  logger: AttLogger;
  attester: Attester;
  attesterWeb3: AttesterWeb3;
  chainManager: ChainManager;
  blockCollector!: Web3BlockCollector;

  constructor(configuration: AttesterClientConfiguration, logger?: AttLogger) {
    if (logger) {
      this.logger = logger;
    } else {
      this.logger = getGlobalLogger();
    }
    this.conf = configuration;
    this.chainManager = new ChainManager(this.logger);
    this.attesterWeb3 = new AttesterWeb3(this.logger, this.conf);
    this.attester = new Attester(this.chainManager, this.conf, this.logger, this.attesterWeb3);
  }

  async start() {
    const version = "1000";

    this.logger.title(`Starting Flare Attester Client v${version}`);

    // create state connector
    await this.attesterWeb3.initialize();

    // process configuration
    await this.initializeConfiguration();

    // initialize time and local time difference
    //const sync = await getInternetTime();
    //this.logger.info(` * Internet time sync ${sync}ms`);

    // validate configuration chains and create nodes
    await this.initializeChains();

    // connect to network block callback
    this.blockCollector = new Web3BlockCollector(
      this.logger,
      this.conf.rpcUrl,
      this.conf.stateConnectorContractAddress,
      "StateConnector",
      undefined,
      (event: any) => {
        this.processEvent(event);
      }
    );
  }

  async initializeConfiguration() {
    // read .env
    DotEnvExt();

    const configData: string = "";
    let accountPrivateKey: string = "";

    this.logger.info(` * Configuration`);

    if (process.env.PROJECT_SECRET === undefined) {
      this.logger.info(`   * Account read from .env`);
      accountPrivateKey = this.conf.accountPrivateKey as string;
    } else if (process.env.USE_GCP_SECRET) {
      this.logger.info(`   * Account read from secret`);
      accountPrivateKey = (await fetchSecret(process.env.PROJECT_SECRET as string)) as string;
    } else {
      this.logger.info(`   * Account read from config`);
      accountPrivateKey = this.conf.accountPrivateKey as string;
    }

    this.logger.info(`   * Network RPC URL from conf '${this.conf.rpcUrl}'`);

    if (accountPrivateKey === "" || accountPrivateKey === undefined) {
      this.logger.error(`   ! ERROR: private key not set`);
    }
  }

  async initializeChains() {
    this.logger.info(" * Initializing chains");

    for (const chain of this.conf.chains) {
      const chainType = MCC.getChainType(chain.name);

      if (chainType === ChainType.invalid) {
        this.logger.debug(`   # '${chain.name}': undefined chain`);
        continue;
      }

      const node = new ChainNode(this.chainManager, chain.name, chainType, chain.metaData, chain);

      this.logger.info(`    * ${chain.name}:#${chainType} '${chain.url}'`);

      // validate this chain node
      if (!(await node.isHealthy())) {
        // this is just a warning since node can be inaccessible at start and will become healthy later on
        this.logger.error(`      ! chain ${chain.name}:#${chainType} is not healthy`);
        continue;
      }

      this.chainManager.nodes.set(chainType, node);
    }
  }

  onlyOnce = false;

  processEvent(event: any) {
    if (event.event === "AttestationRequest") {
      // AttestationRequest
      // // instructions: (uint64 chainId, uint64 blockHeight, uint16 utxo, bool full)
      // // The variable 'full' defines whether to provide the complete transaction details
      // // in the attestation response

      //   // 'instructions' and 'id' are purposefully generalised so that the attestation request
      //   // can pertain to any number of deterministic oracle use-cases in the future.
      //   event AttestationRequest(
      //     uint256 timestamp,
      //     uint256 instructions,
      //     bytes32 id,
      //     bytes32 dataAvailabilityProof
      // );

      //  16 attestation type (bits 0..)
      //  32 chain id
      //  64 block height

      // if (this.onlyOnce) {
      //   return;
      // }
      // this.onlyOnce = true;

      const timeStamp: string = event.returnValues.timestamp;
      const instruction: string = event.returnValues.instructions;
      const id: string = event.returnValues.id;

      const instBN = toBN(instruction);

      const attestationType: BN = partBNbe(instBN, 0, ATT_BITS);

      // attestation info
      const tx = new AttestationData();
      tx.type = attestationType.toNumber() as AttestationType;
      tx.timeStamp = toBN(timeStamp);
      tx.id = id;
      tx.dataAvailabilityProof = event.returnValues.dataAvailabilityProof;

      // attestaion data (full instruction)
      tx.instructions = instBN;

      // for sorting
      tx.blockNumber = toBN(event.blockNumber);
      tx.transactionIndex = toBN(event.transactionIndex);
      tx.signature = toBN(event.signature);

      this.attester.attestate(tx);

      // for (let a = 0; a < 150; a++) {
      //   this.attester.attestate(tx);
      //   sleepms(2);
      // }
    }
  }
}
