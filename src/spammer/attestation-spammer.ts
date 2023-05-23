import { AlgoMccCreate, ChainType, MCC, MccClient, UtxoMccCreate, XrpMccCreate, sleepMs } from "@flarenetwork/mcc";
import Web3 from "web3";
import * as yargs from "yargs";
import { StateConnector } from "../../typechain-web3-v1/StateConnector";
import { StateConnectorTempTran } from "../../typechain-web3-v1/StateConnectorTempTran";
import { DBBlockBase } from "../entity/indexer/dbBlock";
import { DBTransactionBase } from "../entity/indexer/dbTransaction";
import { IndexedQueryManager } from "../indexed-query-manager/IndexedQueryManager";
import { IndexedQueryManagerOptions } from "../indexed-query-manager/indexed-query-manager-types";
import { TxOrBlockGeneratorType, getRandomAttestationRequest, prepareRandomGenerators } from "../indexed-query-manager/random-attestation-requests/random-ar";
import { RandomDBIterator } from "../indexed-query-manager/random-attestation-requests/random-query";
import { readSecureConfig } from "../utils/config/configSecure";
import { DatabaseService } from "../utils/database/DatabaseService";
import { indexerEntities } from "../utils/database/databaseEntities";
import { Web3Functions } from "../utils/helpers/Web3Functions";
import { getTimeMs } from "../utils/helpers/internetTime";
import { getWeb3, getWeb3StateConnectorContract } from "../utils/helpers/web3-utils";
import { getGlobalLogger, logException, setGlobalLoggerLabel, setLoggerName } from "../utils/logging/logger";
import { AttestationDefinitionStore } from "../verification/attestation-types/AttestationDefinitionStore";
import { AttestationTypeScheme } from "../verification/attestation-types/attestation-types";
import { readAttestationTypeSchemes } from "../verification/attestation-types/attestation-types-helpers";
import { ARType } from "../verification/generated/attestation-request-types";
import { SourceId } from "../verification/sources/sources";
import { SpammerCredentials } from "./SpammerConfiguration";

const args = yargs
  .option("chain", { alias: "c", type: "string", description: "Chain (XRP, BTC, LTC, DOGE)", default: "BTC" })
  .option("delay", { alias: "d", type: "number", description: "Delay between sending transactions from the same block", default: 500 })
  .option("loggerLabel", { alias: "l", type: "string", description: "Logger label", default: "" })
  .option("testCred", { alias: "t", type: "boolean", description: "Logger label" })
  .option("configPath", { alias: "f", type: "string", description: "Config path" }).argv;

class AttestationSpammer {
  chainType!: ChainType;
  web3!: Web3;
  web3_2!: Web3;
  logger!: any;
  stateConnector!: StateConnector | StateConnectorTempTran;
  stateConnector_2!: StateConnector | StateConnectorTempTran;

  delay: number = args["delay"];
  lastBlockNumber = -1;
  web3Functions!: Web3Functions;
  web3Functions_2!: Web3Functions;
  logEvents: boolean;

  indexedQueryManager: IndexedQueryManager;
  definitions: AttestationTypeScheme[];
  // attestationRoundManager: AttestationRoundManager;
  spammerCredentials: SpammerCredentials;

  defStore: AttestationDefinitionStore;
  client: MccClient;

  get numberOfConfirmations(): number {
    return this.spammerCredentials.numberOfConfirmations;
  }

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
  }

  async init() {
    this.defStore = new AttestationDefinitionStore();
    await this.defStore.initialize();
    // Reading configuration
    this.spammerCredentials = await readSecureConfig(new SpammerCredentials(), `spammer/${args["chain"].toLowerCase()}-spammer`);

    this.logger = getGlobalLogger();
    this.web3 = getWeb3(this.spammerCredentials.web.rpcUrl) as Web3;

    this.logger.info(`RPC: ${this.spammerCredentials.web.rpcUrl}`);
    this.logger.info(`Using state connector at: ${this.spammerCredentials.web.stateConnectorContractAddress}`);

    this.stateConnector = await getWeb3StateConnectorContract(this.web3, this.spammerCredentials.web.stateConnectorContractAddress);
    this.web3Functions = new Web3Functions(this.logger, this.web3, this.spammerCredentials.web);

    if (this.spammerCredentials.web2 && this.spammerCredentials.web2.accountPrivateKey !== "") {
      this.web3_2 = getWeb3(this.spammerCredentials.web2.rpcUrl) as Web3;

      this.logger.info(`RPC2: ${this.spammerCredentials.web2.rpcUrl}`);
      this.logger.info(`Using state connector 2 at: ${this.spammerCredentials.web2.stateConnectorContractAddress}`);
      // eslint-disable-next-line
      this.stateConnector_2 = await getWeb3StateConnectorContract(this.web3, this.spammerCredentials.web2.stateConnectorContractAddress);
      this.web3Functions_2 = new Web3Functions(this.logger, this.web3_2, this.spammerCredentials.web2);
    }

    let dbService = new DatabaseService(
      getGlobalLogger(),
      {
        ...this.spammerCredentials.indexerDatabase,
        entities: indexerEntities(args["chain"]),
        dropSchema: false,
        synchronize: false,
      },
      "indexer"
    );
    await dbService.connect();

    const options: IndexedQueryManagerOptions = {
      chainType: this.chainType,
      numberOfConfirmations: () => {
        return this.numberOfConfirmations;
      },
      entityManager: dbService.manager,
    } as IndexedQueryManagerOptions;
    this.indexedQueryManager = new IndexedQueryManager(options);

    await this.initializeStateConnector();
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
  async sendAttestationRequest(stateConnector: StateConnector | StateConnectorTempTran, request: ARType) {
    // let scheme = this.definitions.find(definition => definition.id === request.attestationType);
    // let requestBytes = encodeRequestBytes(request, scheme);

    const requestBytes = this.defStore.encodeRequest(request);
    // // DEBUG CODE
    //console.log("SENDING:\n", requestBytes, "\n", request);
    // console.log("SENDING:\n", requestBytes, "\n");

    const fnToEncode = stateConnector.methods.requestAttestations(requestBytes);
    AttestationSpammer.sendId++;
    //console.time(`request attestation ${this.id} #${AttestationSpammer.sendId}`)
    const receipt = await this.web3Functions.signAndFinalize3Sequenced(
      `request attestation #${AttestationSpammer.sendCount}`,
      this.stateConnector.options.address,
      fnToEncode,
      getTimeMs() + 5000,
      false
    );
    //console.timeEnd(`request attestation ${this.id} #${AttestationSpammer.sendId}`)
    if (receipt) {
      this.logger.info(`Attestation sent`);
    }

    if (this.web3Functions_2) {
      const receipt2 = await this.web3Functions_2.signAndFinalize3Sequenced(
        `request attestation 2 #${AttestationSpammer.sendCount}`,
        this.stateConnector_2.options.address,
        fnToEncode,
        getTimeMs() + 5000,
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
      } catch (e) {
        this.logger.info(`Error: ${e}`);
      }
      await sleepMs(200);
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
              // const parsedRequest = parseRequest(data);
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

  private getClient() {
    let chainName = args["chain"].toLowerCase();
    switch (chainName) {
      case "btc":
        return new MCC.BTC(this.spammerCredentials.chainConfiguration.mccCreate as UtxoMccCreate);
      case "ltc":
        return new MCC.LTC(this.spammerCredentials.chainConfiguration.mccCreate as UtxoMccCreate);
      case "doge":
        return new MCC.DOGE(this.spammerCredentials.chainConfiguration.mccCreate as UtxoMccCreate);
      case "xrp":
        return undefined;
        // return new MCC.XRP(this.spammerCredentials.chainConfiguration.mccCreate as XrpMccCreate);
      case "algo":
        return undefined;
        // return new MCC.ALGO(this.spammerCredentials.chainConfiguration.mccCreate as AlgoMccCreate);
      default:
        throw new Error(`Unknown chain ${chainName}`);
    }
  }

  async runSpammer() {
    this.client = this.getClient();
    while (true) {
      try {
        AttestationSpammer.sendCount++;
        // const attRequest = validTransactions[await getRandom(0, validTransactions.length - 1)];
        
        const attRequest = await getRandomAttestationRequest(
          this.defStore,
          this.logger,
          this.randomGenerators,
          this.indexedQueryManager,
          this.chainType as number as SourceId,
          this.client
        );

        if (attRequest) {
          try {
            await this.sendAttestationRequest(this.stateConnector, attRequest);
          } catch (e0) {
            logException("runSpammer::sendAttestationRequest", e0);
          }
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
      logger.info(`${args["loggerLabel"]} ${(AttestationSpammer.sendCount * 1000) / period} req/sec`);
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

setLoggerName("spammer");
setGlobalLoggerLabel(args["chain"]);

if (args["testCred"]) {
  process.env.TEST_CREDENTIALS = "1";
  process.env.NODE_ENV = "development";
}

if (args["configPath"]) {
  process.env.SECURE_CONFIG_PATH = args["configPath"];
}

runAllAttestationSpammers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
