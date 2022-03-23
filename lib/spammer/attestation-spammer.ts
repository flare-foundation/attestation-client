import { logger } from "ethers";
import { ChainType, MCC, MccClient, sleepMs } from "flare-mcc";
import Web3 from "web3";
import * as configIndexer from "../../configs/config-indexer.json";
import * as configAttestationClient from "../../configs/config.json";
import { StateConnector } from "../../typechain-web3-v1/StateConnector";
import { AttesterClientChain } from "../attester/AttesterClientChain";
import { AttesterClientConfiguration } from "../attester/AttesterClientConfiguration";
import { DBBlockBase } from "../entity/dbBlock";
import { DBTransactionBase } from "../entity/dbTransaction";
import { IndexedQueryManagerOptions } from "../indexed-query-manager/indexed-query-manager-types";
import { RandomDBIterator } from "../indexed-query-manager/indexed-query-manager-utils";
import { IndexedQueryManager } from "../indexed-query-manager/IndexedQueryManager";
import { getRandomAttestationRequest, prepareRandomGenerators, TxOrBlockGeneratorType } from "../indexed-query-manager/random-attestation-requests/random-ar";
import { IndexerClientChain, IndexerConfiguration } from "../indexer/IndexerConfiguration";
import { DotEnvExt } from "../utils/DotEnvExt";
import { getGlobalLogger } from "../utils/logger";
import { getTestStateConnectorAddress, getWeb3, getWeb3Contract, sleepms } from "../utils/utils";
import { DEFAULT_GAS, DEFAULT_GAS_PRICE, Web3Functions } from "../utils/Web3Functions";
import { AttestationTypeScheme } from "../verification/attestation-types/attestation-types";
import { readAttestationTypeSchemes } from "../verification/attestation-types/attestation-types-helpers";
import { encodeRequest } from "../verification/generated/attestation-request-encode";
import { parseRequest } from "../verification/generated/attestation-request-parse";
import { ARType } from "../verification/generated/attestation-request-types";
import { getSourceName, SourceId } from "../verification/sources/sources";

let fs = require("fs");

//dotenv.config();
DotEnvExt();

// console.log(process.env);

var yargs = require("yargs");

let args = yargs
  .option("chain", {
    alias: "c",
    type: "string",
    description: "Chain (XRP, BTC, LTC, DOGE)",
    default: "ALGO",
  })
  .option("rpcLink", {
    alias: "r",
    type: "string",
    description: "RPC to Flare network",
    default: "http://127.0.0.1:9650/ext/bc/C/rpc",
  })
  .option("abiPath", {
    alias: "a",
    type: "string",
    description: "Path to abi JSON file",
    default: "artifacts/contracts/StateConnector.sol/StateConnector.json",
  })
  .option("contractAddress", {
    alias: "t",
    type: "string",
    description: "Address of the deployed contract"
  })
  .option("range", {
    alias: "w",
    type: "number",
    description: "Random block range",
    default: 1000,
  })
  .option("nonceResetCount", {
    alias: "e",
    type: "number",
    description: "Reset nonce period",
    default: 10,
  })
  .option("delay", {
    alias: "d",
    type: "number",
    description: "Delay between sending transactions from the same block",
    default: 500,
  })
  .option("accountsFile", {
    alias: "k",
    type: "string",
    description: "Private key accounts file",
    default: "test-1020-accounts.json",
  })
  .option("startAccountId", {
    alias: "b",
    type: "number",
    description: "Start account id",
    default: 0,
  })
  .option("numberOfAccounts", {
    alias: "o",
    type: "number",
    description: "Number of accounts",
    default: 1,
  })
  .option("loggerLabel", {
    alias: "l",
    type: "string",
    description: "Logger label",
    default: "",
  })
  .argv;

class AttestationSpammer {
  chainType!: ChainType;
  client!: MccClient;
  web3!: Web3;
  logger!: any;
  stateConnector!: StateConnector;
  range: number = args["range"];
  rpcLink: string = args["rpcLink"];

  confirmations: number = args["confirmations"];
  privateKey: string;
  delay: number = args["delay"];
  lastBlockNumber: number = -1;
  web3Functions!: Web3Functions;
  logEvents: boolean;

  configIndexer: IndexerConfiguration;
  configAttestationClient: AttesterClientConfiguration;

  chainAttestationConfig: AttesterClientChain;
  chainIndexerConfig: IndexerClientChain;

  indexedQueryManager: IndexedQueryManager;
  definitions: AttestationTypeScheme[];

  numberOfConfirmations = 6;
  BUFFER_TIMESTAMP_OFFSET: number = 0;
  BUFFER_WINDOW: number = 1

  BATCH_SIZE = 100;
  TOP_UP_THRESHOLD = 0.25;

  id: string;

  randomGenerators: Map<TxOrBlockGeneratorType, RandomDBIterator<DBTransactionBase | DBBlockBase>>;

  constructor(privateKey: string, initFrom?: AttestationSpammer, id: string = "default", logEvents = true) {
    this.privateKey = privateKey;
    this.id = id;
    this.logEvents = logEvents;
    this.chainType = MCC.getChainType(args["chain"]);

    this.configAttestationClient = configAttestationClient as any as AttesterClientConfiguration;
    this.configIndexer = configIndexer as IndexerConfiguration;

    let chainName = getSourceName(this.chainType);

    this.chainAttestationConfig = this.configAttestationClient.chains.find(chain => chain.name === chainName);
    this.chainIndexerConfig = this.configIndexer.chains.find(chain => chain.name === chainName);

    this.numberOfConfirmations = (this.chainAttestationConfig.metaData as any).requiredBlocks as number;
    //  startTime = Math.floor(Date.now()/1000) - HISTORY_WINDOW;

    this.client = initFrom
      ? initFrom.client
      : MCC.Client(this.chainType, {
        ...this.chainIndexerConfig.mccCreate,
        rateLimitOptions: this.chainIndexerConfig.rateLimitOptions
      });

    if (initFrom) {
      this.indexedQueryManager = initFrom.indexedQueryManager;
      this.logger = initFrom.logger;
      this.web3 = initFrom.web3;
      this.stateConnector = initFrom.stateConnector;
      this.definitions = initFrom.definitions;
      this.BUFFER_TIMESTAMP_OFFSET = initFrom.BUFFER_TIMESTAMP_OFFSET;
      this.BUFFER_WINDOW = initFrom.BUFFER_WINDOW;
  
    } else {
      const options: IndexedQueryManagerOptions = {
        chainType: this.chainType,
        numberOfConfirmations: this.chainIndexerConfig.numberOfConfirmations,
        maxValidIndexerDelaySec: this.chainAttestationConfig.maxValidIndexerDelaySec,
        windowStartTime: (roundId: number) => {
          return this.configAttestationClient.firstEpochStartTime + roundId * this.configAttestationClient.roundDurationSec - this.chainAttestationConfig.queryWindowInSec;
        }
      } as IndexedQueryManagerOptions;
      this.indexedQueryManager = new IndexedQueryManager(options);
      this.logger = getGlobalLogger(args["loggerLabel"]);
      this.web3 = getWeb3(this.rpcLink) as Web3;
      let stateConnectorAddresss = args["contractAddress"] || getTestStateConnectorAddress()

      this.logger.info(`RPC: ${this.rpcLink}`)
      this.logger.info(`Using state connector at: ${stateConnectorAddresss}`)
      getWeb3Contract(this.web3, stateConnectorAddresss, "StateConnector").then((sc: StateConnector) => {
        this.stateConnector = sc;
      });
    }
    this.web3Functions = new Web3Functions(this.logger, this.web3, this.privateKey);
  }

  async init() {
    await this.initializeStateConnector();
    await this.indexedQueryManager.dbService.waitForDBConnection();
    this.randomGenerators = await prepareRandomGenerators(this.indexedQueryManager, this.BATCH_SIZE, this.TOP_UP_THRESHOLD);
    this.startLogEvents();
    this.definitions = await readAttestationTypeSchemes();
  }

  getCurrentRound() {
    let now = Math.floor(Date.now() / 1000);
    return Math.floor((now - this.BUFFER_TIMESTAMP_OFFSET) / this.BUFFER_WINDOW)
  }

  static sendId = 0;
  async sendAttestationRequest(stateConnector: StateConnector, request: ARType) {
    // let scheme = this.definitions.find(definition => definition.id === request.attestationType);
    // let requestBytes = encodeRequestBytes(request, scheme);

    let requestBytes = encodeRequest(request);
    // // DEBUG CODE
    // console.log("SENDING:\n", requestBytes, "\n", request);
    // console.log("SENDING:\n", requestBytes, "\n");

    let fnToEncode = stateConnector.methods.requestAttestations(requestBytes);
    AttestationSpammer.sendId++;
    //console.time(`request attestation ${this.id} #${AttestationSpammer.sendId}`)
    const receipt = await this.web3Functions.signAndFinalize3(
      `request attestation #${AttestationSpammer.sendCount}`,
      this.stateConnector.options.address,
      fnToEncode,
      DEFAULT_GAS,
      DEFAULT_GAS_PRICE,
      true
    );
    //console.timeEnd(`request attestation ${this.id} #${AttestationSpammer.sendId}`)
    if (receipt) {
      // this.logger.info(`Attestation sent`)
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
        let last = this.lastBlockNumber;
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

  async startLogEvents(maxBlockFetch = 100) {
    this.lastBlockNumber = await this.web3.eth.getBlockNumber();
    let firstUnprocessedBlockNumber = this.lastBlockNumber;
    this.syncBlocks();
    while (true) {
      await sleepMs(200);
      try {
        let last = Math.min(firstUnprocessedBlockNumber + maxBlockFetch, this.lastBlockNumber);
        if (firstUnprocessedBlockNumber > last) {
          continue;
        }
        let events = await this.stateConnector.getPastEvents("AttestationRequest", {
          fromBlock: firstUnprocessedBlockNumber,
          toBlock: last,
        });
        // DEBUG CODE
        if (events.length) {
          for (let event of events) {
            if (event.event === "AttestationRequest") {
              let timestamp = event.returnValues.timestamp;
              let data = event.returnValues.data;
              let parsedRequest = parseRequest(data);
              // console.log("RECEIVED:\n", data, "\n", parsedRequest);
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
    // await this.init();
    // this.startLogEvents();


    // load data from 'database'
    // const data = "[" + fs.readFileSync(`db/transactions.${args.loggerLabel}.valid.json`).toString().slice(0, -2).replace(/\n/g, "") + "]";
    // const validTransactions: Array<AttestationRequest> = JSON.parse(data);
    // const invalidTransactions: Array<AttestationRequest> = JSON.parse("[" + fs.readFileSync(`db/transactions.${args.loggerLabel}.invalid.json`).toString().slice(0, -1) + "]");

    // JSON saves BN as hex strings !!!@@!#$!@#
    // for (let a = 0; a < validTransactions.length; a++) {
    //   try {
    //     if (validTransactions[a].timestamp) {
    //       validTransactions[a].timestamp = new BN(validTransactions[a].timestamp!, "hex");
    //     }
    //     validTransactions[a].instructions = new BN(validTransactions[a].instructions, "hex");
    //   } catch { }
    // }

    // for (let a = 0; a < invalidTransactions.length; a++) {
    //   try {
    //     if (invalidTransactions[a].timestamp) {
    //       invalidTransactions[a].timestamp = new BN(invalidTransactions[a].timestamp!, "hex");
    //     }
    //     invalidTransactions[a].instructions = new BN(invalidTransactions[a].instructions, "hex");
    //   } catch {}
    // }

    let attRequest: ARType | undefined;
    while (true) {
      try {
        AttestationSpammer.sendCount++;
        // const attRequest = validTransactions[await getRandom(0, validTransactions.length - 1)];
        
        let roundId = this.getCurrentRound();

        let attRequest = await getRandomAttestationRequest(this.randomGenerators, this.indexedQueryManager, this.chainType as number as SourceId, roundId, this.numberOfConfirmations);
        
        if (attRequest) {
          this.sendAttestationRequest(this.stateConnector, attRequest).catch(e => {
            this.logger.error(`ERROR: ${e}`);
          })
        }
      } catch (e) {
        this.logger.error(`ERROR: ${e}`);
      }
      // if (!attRequest) {
      //   await sleep(Math.floor(Math.random() * this.delay));
      // }
      await sleepMs(Math.floor(this.delay + Math.random()*this.delay));
    }
  }
}

async function displayStats() {
  const period = 5000;
  while (true) {
    await sleepMs(period);

    logger.info(`${args.loggerLabel} ${(AttestationSpammer.sendCount * 1000) / period} req/sec`);
    AttestationSpammer.sendCount = 0;
  }
}

async function runAllAttestationSpammers() {
  displayStats();

  const accounts = JSON.parse(fs.readFileSync(args["accountsFile"]));
  const privateKeys: string[] = accounts.map((x: any) => x.privateKey).slice(args["startAccountId"], args["startAccountId"] + args["numberOfAccounts"]);

  let first = new AttestationSpammer(privateKeys[0], undefined, "L_" + 0, true);
  await first.init();
  
  let promises = [
    first.runSpammer(), 
    ...(privateKeys.slice(1).map((key, number) => new AttestationSpammer(key, first, "L_" + (number + 1), false).runSpammer()))
  ];
  return Promise.all(promises)
  
}

// (new AttestationSpammer()).runSpammer()
runAllAttestationSpammers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
