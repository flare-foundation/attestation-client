import { ChainType, MCC, sleepMs } from "@flarenetwork/mcc";
import Web3 from "web3";
import { StateConnector } from "../../typechain-web3-v1/StateConnector";
import { AttestationRoundManager } from "../attester/AttestationRoundManager";
import { AttesterCredentials } from "../attester/AttesterClientConfiguration";
import { DBBlockBase } from "../entity/indexer/dbBlock";
import { DBTransactionBase } from "../entity/indexer/dbTransaction";
import { IndexedQueryManagerOptions } from "../indexed-query-manager/indexed-query-manager-types";
import { IndexedQueryManager } from "../indexed-query-manager/IndexedQueryManager";
import { getRandomAttestationRequest, prepareRandomGenerators, TxOrBlockGeneratorType } from "../indexed-query-manager/random-attestation-requests/random-ar";
import { RandomDBIterator } from "../indexed-query-manager/random-attestation-requests/random-query";
import { readConfig, readCredentials } from "../utils/config";
import { DatabaseService } from "../utils/databaseService";
import { DotEnvExt } from "../utils/DotEnvExt";
import { getTimeMilli } from "../utils/internetTime";
import { getGlobalLogger, logException, setGlobalLoggerLabel, setLoggerName } from "../utils/logger";
import { getWeb3, getWeb3StateConnectorContract } from "../utils/utils";
import { DEFAULT_GAS, DEFAULT_GAS_PRICE, Web3Functions } from "../utils/Web3Functions";
import { AttestationTypeScheme } from "../verification/attestation-types/attestation-types";
import { readAttestationTypeSchemes } from "../verification/attestation-types/attestation-types-helpers";
import { encodeRequest } from "../verification/generated/attestation-request-encode";
import { parseRequest } from "../verification/generated/attestation-request-parse";
import { ARType } from "../verification/generated/attestation-request-types";
import { SourceId } from "../verification/sources/sources";
import { SpammerConfig, SpammerCredentials } from "./SpammerConfiguration";

const fs = require("fs");

//dotenv.config();
DotEnvExt();

const yargs = require("yargs");

const args = yargs
  .option("chain", { alias: "c", type: "string", description: "Chain (XRP, BTC, LTC, DOGE)", default: "BTC" })
  .option("credentials", {
    alias: "cred",
    type: "string",
    description: "Path to credentials json file",
    default: "./configs/spammer-credentials.json",
    demand: false,
  })
  .option("rpcLink", { alias: "r", type: "string", description: "RPC to Flare network", default: "http://127.0.0.1:9650/ext/bc/C/rpc" })
  .option("abiPath", {
    alias: "a",
    type: "string",
    description: "Path to abi JSON file",
    default: "artifacts/contracts/StateConnector.sol/StateConnector.json",
  })
  .option("contractAddress", { alias: "t", type: "string", description: "Address of the deployed contract" })
  .option("range", { alias: "w", type: "number", description: "Random block range", default: 1000 })
  .option("nonceResetCount", { alias: "e", type: "number", description: "Reset nonce period", default: 10 })
  .option("delay", { alias: "d", type: "number", description: "Delay between sending transactions from the same block", default: 500 })
  .option("accountsFile", { alias: "k", type: "string", description: "Private key accounts file", default: "test-1020-accounts.json" })
  .option("startAccountId", { alias: "b", type: "number", description: "Start account id", default: 0 })
  .option("numberOfAccounts", { alias: "o", type: "number", description: "Number of accounts", default: 1 })
  .option("loggerLabel", { alias: "l", type: "string", description: "Logger label", default: "" }).argv;

class AttestationSpammer {
  chainType!: ChainType;
  web3!: Web3;
  web3_2!: Web3;
  logger!: any;
  stateConnector!: StateConnector;
  stateConnector_2!: StateConnector;

  delay: number = args["delay"];
  lastBlockNumber = -1;
  web3Functions!: Web3Functions;
  web3Functions_2!: Web3Functions;
  logEvents: boolean;

  indexedQueryManager: IndexedQueryManager;
  definitions: AttestationTypeScheme[];

  get numberOfConfirmations(): number {
    // todo: get from chain confing
    return 6; //AttestationRoundManager.getSourceHandlerConfig(getSourceName(this.chainType)).numberOfConfirmations;;
  }

  spammerConfig: SpammerConfig;

  BUFFER_TIMESTAMP_OFFSET = 0;
  BUFFER_WINDOW = 1;

  BATCH_SIZE = 10;
  TOP_UP_THRESHOLD = 0.25;

  id: string;

  randomGenerators: Map<TxOrBlockGeneratorType, RandomDBIterator<DBTransactionBase | DBBlockBase>>;

  constructor() {
    this.id = "default";
    this.logEvents = true;
    this.chainType = MCC.getChainType(args["chain"]);

    // Reading configuration
    this.spammerConfig = readConfig(new SpammerConfig(), "spammer");
    const spammerCredentials = readCredentials(new SpammerCredentials(), "spammer");

    AttestationRoundManager.credentials = new AttesterCredentials();
    AttestationRoundManager.credentials.web = spammerCredentials.web;

    const options: IndexedQueryManagerOptions = {
      chainType: this.chainType,
      numberOfConfirmations: () => {
        return this.numberOfConfirmations;
      },
      // todo: get from chain confing
      maxValidIndexerDelaySec: 10, //this.chainAttestationConfig.maxValidIndexerDelaySec,
      dbService: new DatabaseService(getGlobalLogger(), spammerCredentials.indexerDatabase, "indexer"),

      windowStartTime: (roundId: number) => {
        // todo: read this from DAC
        const queryWindowInSec = 86400;
        return this.spammerConfig.firstEpochStartTime + roundId * this.spammerConfig.roundDurationSec - queryWindowInSec;
      },
      UBPCutoffTime: (roundId: number) => {
        // todo: read this from DAC
        const UBPCutTime = 60 * 30;
        return this.spammerConfig.firstEpochStartTime + roundId * this.spammerConfig.roundDurationSec - UBPCutTime;
      },

    } as IndexedQueryManagerOptions;
    this.indexedQueryManager = new IndexedQueryManager(options);
    this.logger = getGlobalLogger();
    this.web3 = getWeb3(spammerCredentials.web.rpcUrl) as Web3;

    //let stateConnectorAddress = spammerCredentials.web.stateConnectorContractAddress;

    this.logger.info(`RPC: ${spammerCredentials.web.rpcUrl}`);
    this.logger.info(`Using state connector at: ${spammerCredentials.web.stateConnectorContractAddress}`);

    // eslint-disable-next-line
    getWeb3StateConnectorContract(this.web3, spammerCredentials.web.stateConnectorContractAddress).then((sc: StateConnector) => {
      this.stateConnector = sc;
    });

    this.web3Functions = new Web3Functions(this.logger, this.web3, spammerCredentials.web.accountPrivateKey);

    if (spammerCredentials.web2) {
      this.web3_2 = getWeb3(spammerCredentials.web2.rpcUrl) as Web3;

      this.logger.info(`RPC2: ${spammerCredentials.web2.rpcUrl}`);
      this.logger.info(`Using state connector 2 at: ${spammerCredentials.web2.stateConnectorContractAddress}`);
      // eslint-disable-next-line
      getWeb3StateConnectorContract(this.web3, spammerCredentials.web2.stateConnectorContractAddress).then((sc: StateConnector) => {
        this.stateConnector_2 = sc;
      });

      this.web3Functions_2 = new Web3Functions(this.logger, this.web3_2, spammerCredentials.web2.accountPrivateKey);
    }
  }

  async init() {
    await this.initializeStateConnector();
    await this.indexedQueryManager.dbService.waitForDBConnection();
    this.randomGenerators = await prepareRandomGenerators(this.indexedQueryManager, this.BATCH_SIZE, this.TOP_UP_THRESHOLD);

    // eslint-disable-next-line
    this.startLogEvents();
    this.definitions = await readAttestationTypeSchemes();
    this.logger.info(`Running spammer for ${args["chain"]}`);

    this.logger.info(`Sending from address ${this.web3Functions.account.address}`);
    if (this.web3Functions_2) {
      this.logger.info(`Sending from address2 ${this.web3Functions_2.account.address}`);
    }
  }

  getCurrentRound() {
    const now = Math.floor(Date.now() / 1000);
    return Math.floor((now - this.BUFFER_TIMESTAMP_OFFSET) / this.BUFFER_WINDOW);
  }

  static sendId = 0;
  async sendAttestationRequest(stateConnector: StateConnector, request: ARType) {
    // let scheme = this.definitions.find(definition => definition.id === request.attestationType);
    // let requestBytes = encodeRequestBytes(request, scheme);

    const requestBytes = encodeRequest(request);
    // // DEBUG CODE
    //console.log("SENDING:\n", requestBytes, "\n", request);
    // console.log("SENDING:\n", requestBytes, "\n");

    const fnToEncode = stateConnector.methods.requestAttestations(requestBytes);
    AttestationSpammer.sendId++;
    //console.time(`request attestation ${this.id} #${AttestationSpammer.sendId}`)
    const receipt = await this.web3Functions.signAndFinalize3(
      `request attestation #${AttestationSpammer.sendCount}`,
      this.stateConnector.options.address,
      fnToEncode,
      getTimeMilli() + 5000,
      DEFAULT_GAS,
      DEFAULT_GAS_PRICE,
      false
    );
    //console.timeEnd(`request attestation ${this.id} #${AttestationSpammer.sendId}`)
    if (receipt) {
      this.logger.info(`Attestation sent`);
    }

    if (this.web3Functions_2) {
      const receipt2 = await this.web3Functions_2.signAndFinalize3(
        `request attestation 2 #${AttestationSpammer.sendCount}`,
        this.stateConnector_2.options.address,
        fnToEncode,
        getTimeMilli() + 5000,
        DEFAULT_GAS,
        DEFAULT_GAS_PRICE,
        false
      );
      //console.timeEnd(`request attestation ${this.id} #${AttestationSpammer.sendId}`)
      if (receipt2) {
        this.logger.info(`Attestation 2 sent`);
      }

    }

    return receipt;
  }

  async initializeStateConnector() {
    while (!this.stateConnector) {
      await sleepMs(100);
    }

    this.BUFFER_TIMESTAMP_OFFSET = parseInt(await this.stateConnector.methods.BUFFER_TIMESTAMP_OFFSET().call(), 10);
    this.BUFFER_WINDOW = parseInt(await this.stateConnector.methods.BUFFER_WINDOW().call(), 10);
  }

  async syncBlocks() {
    while (true) {
      try {
        const last = this.lastBlockNumber;
        this.lastBlockNumber = await this.web3.eth.getBlockNumber();
        // if(this.lastBlockNumber > last) {
        //   this.logger.info(`Last block: ${this.lastBlockNumber}`)
        // }
        await sleepMs(200);
      } catch (e) {
        this.logger.info(`Error: ${e}`);
      }
    }
  }

  async startLogEvents(maxBlockFetch = 30) {
    this.lastBlockNumber = await this.web3.eth.getBlockNumber();
    let firstUnprocessedBlockNumber = this.lastBlockNumber;

    // eslint-disable-next-line
    this.syncBlocks();

    while (true) {
      await sleepMs(200);
      try {
        const last = Math.min(firstUnprocessedBlockNumber + maxBlockFetch, this.lastBlockNumber);
        if (firstUnprocessedBlockNumber > last) {
          continue;
        }
        const events = await this.stateConnector.getPastEvents("AttestationRequest", {
          fromBlock: firstUnprocessedBlockNumber,
          toBlock: last,
        });
        // DEBUG CODE
        if (events.length) {
          for (const event of events) {
            if (event.event === "AttestationRequest") {
              const timestamp = event.returnValues.timestamp;
              const data = event.returnValues.data;
              const parsedRequest = parseRequest(data);
              //
              //console.log("RECEIVED:\n", data, "\n", parsedRequest);
              // console.log("RECEIVED:\n", data);
            }
          }
        }
        this.logger.info(`Receiving ${events.length} events from block ${firstUnprocessedBlockNumber} to ${last}`);
        firstUnprocessedBlockNumber = last + 1;
      } catch (e) {
        this.logger.info(`Error: ${e}`);
      }
    }
  }

  static sendCount = 0;

  async runSpammer() {
    let attRequest: ARType | undefined;
    while (true) {
      try {
        AttestationSpammer.sendCount++;
        // const attRequest = validTransactions[await getRandom(0, validTransactions.length - 1)];

        const roundId = this.getCurrentRound();

        const attRequest = await getRandomAttestationRequest(
          this.randomGenerators,
          this.indexedQueryManager,
          this.chainType as number as SourceId,
          roundId,
          this.numberOfConfirmations
        );

        if (attRequest) {
          this.sendAttestationRequest(this.stateConnector, attRequest).catch((e) => {
            logException("runSpammer::sendAttestationRequest", e);
          });
        } else {
          this.logger.info("NO random attestation request");
        }
      } catch (e) {
        logException("runSpammer", e);
      }

      await sleepMs(Math.floor(this.delay + Math.random() * this.delay));
    }
  }
}

async function displayStats() {
  const period = 5000;

  const logger = getGlobalLogger();

  while (true) {
    await sleepMs(period);

    try {
      logger.info(`${args.loggerLabel} ${(AttestationSpammer.sendCount * 1000) / period} req/sec`);
      AttestationSpammer.sendCount = 0;
    } catch (error) {
      logException(error, `displayStats`);
    }
  }
}

async function runAllAttestationSpammers() {
  
  // eslint-disable-next-line
  displayStats();

  const spammer = new AttestationSpammer();
  await spammer.init();

  await spammer.runSpammer();
}

setLoggerName( "spammer" );
setGlobalLoggerLabel(args.chain)

// (new AttestationSpammer()).runSpammer()
runAllAttestationSpammers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
