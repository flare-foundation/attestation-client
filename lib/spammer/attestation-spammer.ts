import BN from "bn.js";
import * as dotenv from "dotenv";
import { logger } from "ethers";
import { ChainType, MCC, RPCInterface, sleep } from "flare-mcc";
import Web3 from "web3";
import { StateConnector } from "../../typechain-web3-v1/StateConnector";
import { getGlobalLogger } from "../utils/logger";
import { getRandom, getWeb3, getWeb3Contract } from "../utils/utils";
import { DEFAULT_GAS, DEFAULT_GAS_PRICE, Web3Functions } from "../utils/Web3Functions";
import { AttestationRequest } from "../verification/attestation-types";
let fs = require("fs");

dotenv.config();
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
    description: "Address of the deployed contract",
    default: "0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F", // default hardhat address when run with yarn stateconnector
  })
  .option("blockchainURL", {
    alias: "u",
    type: "string",
    description: "RPC url for blockchain",
    default: "http://testnode3.c.aflabs.net:4001/",
  })
  .option("blockchainUsername", {
    alias: "s",
    type: "string",
    description: "Blockchain node username",
    default: "rpcuser",
  })
  .option("blockchainPassword", {
    alias: "p",
    type: "string",
    description: "Blockchain node password",
    default: "rpcpass",
  })
  .option("blockchainToken", {
    alias: "h",
    type: "string",
    description: "Blockchain node access token",
    default: "7f90419ceab8fde42b2bd50c44ed21c0aefebc614f73b27619549f366b060a14",
  })
  .option("blockchainIndexerURL", {
    alias: "i",
    type: "string",
    description: "RPC url for indexer (algo only)",
    default: "http://testnode3.c.aflabs.net:8980/",
  })
  .option("blockchainIndexerToken", {
    alias: "j",
    type: "string",
    description: "Blockchain access token for indexer (algo only)",
    default: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadddd",
  })
  .option("confirmations", {
    alias: "f",
    type: "number",
    description: "Number of confirmations",
    default: 6,
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
  .option("databaseFile", {
    alias: "g",
    type: "string",
    description: "Database file",
    default: "",
  }).argv;

class AttestationSpammer {
  chainType!: ChainType;
  client!: RPCInterface;
  web3!: Web3;
  logger!: any;
  stateConnector!: StateConnector;
  range: number = args["range"];
  rpcLink: string = args["rpcLink"];

  URL: string = args["blockchainURL"];
  USERNAME?: string = args["blockchainUsername"];
  PASSWORD?: string = args["blockchainPassword"];
  confirmations: number = args["confirmations"];
  privateKey: string;
  delay: number = args["delay"];
  lastBlockNumber: number = -1;
  web3Functions!: Web3Functions;
  logEvents: boolean;

  constructor(privateKey: string, logEvents = true) {
    this.privateKey = privateKey;
    this.logEvents = logEvents;
    this.chainType = MCC.getChainType(args["chain"]);
    switch (this.chainType) {
      case ChainType.BTC:
      case ChainType.LTC:
      case ChainType.DOGE:
        this.client = MCC.Client(this.chainType, { url: this.URL, username: this.USERNAME, password: this.PASSWORD }) as RPCInterface;
        break;
      case ChainType.XRP:
        this.client = MCC.Client(this.chainType, { url: this.URL, username: this.USERNAME, password: this.PASSWORD }) as RPCInterface;
        break;
      case ChainType.ALGO:
        const algoCreateConfig = {
          algod: {
            url: args["blockchainURL"],
            token: args["blockchainToken"],
          },
          indexer: {
            url: args["blockchainIndexerURL"],
            token: args["blockchainIndexerToken"],
          },
        };
        this.client = MCC.Client(this.chainType, algoCreateConfig) as RPCInterface;
        break;
      default:
        throw new Error("");
    }

    // let mccClient = new MCClient(new MCCNodeSettings(this.chainType, this.URL, this.USERNAME || "", this.PASSWORD || "", null));
    this.logger = getGlobalLogger(args["loggerLabel"]);
    this.web3 = getWeb3(this.rpcLink) as Web3;
    this.web3Functions = new Web3Functions(this.logger, this.web3, this.privateKey);

    getWeb3Contract(this.web3, args["contractAddress"], "StateConnector").then((sc: StateConnector) => {
      this.stateConnector = sc;
    });
  }

  async sendAttestationRequest(stateConnector: StateConnector, request: AttestationRequest) {
    let fnToEncode = stateConnector.methods.requestAttestations(request.instructions, request.id, request.dataAvailabilityProof);
    const receipt = await this.web3Functions.signAndFinalize3(
      `request attestation #${AttestationSpammer.sendCount}`,
      this.stateConnector.options.address,
      fnToEncode,
      DEFAULT_GAS,
      DEFAULT_GAS_PRICE,
      true
    );

    if (receipt) {
      // this.logger.info(`Attestation sent`)
    }

    return receipt;
  }

  async waitForStateConnector() {
    while (!this.stateConnector) {
      await sleep(100);
    }
  }

  static sendCount = 0;

  async runSpammer() {
    await this.waitForStateConnector();

    // load data from 'database'
    const data = "[" + fs.readFileSync(`db/transactions.${args.loggerLabel}.valid.json`).toString().slice(0, -2).replace(/\n/g, "") + "]";
    const validTransactions: Array<AttestationRequest> = JSON.parse(data);
    // const invalidTransactions: Array<AttestationRequest> = JSON.parse("[" + fs.readFileSync(`db/transactions.${args.loggerLabel}.invalid.json`).toString().slice(0, -1) + "]");

    // JSON saves BN as hex strings !!!@@!#$!@#
    for (let a = 0; a < validTransactions.length; a++) {
      try {
        if (validTransactions[a].timestamp) {
          validTransactions[a].timestamp = new BN(validTransactions[a].timestamp!, "hex");
        }
        validTransactions[a].instructions = new BN(validTransactions[a].instructions, "hex");
      } catch {}
    }

    // for (let a = 0; a < invalidTransactions.length; a++) {
    //   try {
    //     if (invalidTransactions[a].timestamp) {
    //       invalidTransactions[a].timestamp = new BN(invalidTransactions[a].timestamp!, "hex");
    //     }
    //     invalidTransactions[a].instructions = new BN(invalidTransactions[a].instructions, "hex");
    //   } catch {}
    // }

    while (true) {
      try {
        AttestationSpammer.sendCount++;
        const attRequest = validTransactions[await getRandom(0, validTransactions.length - 1)];
        await this.sendAttestationRequest(this.stateConnector, attRequest); // async call
      } catch (e) {
        this.logger.error(`ERROR: ${e}`);
      }
      await sleep(Math.floor(Math.random() * this.delay));
      //await sleep(Math.floor(this.delay));
    }
  }
}

async function displayStats() {
  const period = 5000;
  while (true) {
    await sleep(period);

    logger.info(`${args.loggerLabel} ${(AttestationSpammer.sendCount * 1000) / period} req/sec`);
    AttestationSpammer.sendCount = 0;
  }
}

async function runAllAttestationSpammers() {
  displayStats();

  const accounts = JSON.parse(fs.readFileSync(args["accountsFile"]));
  const privateKeys: string[] = accounts.map((x: any) => x.privateKey).slice(args["startAccountId"], args["startAccountId"] + args["numberOfAccounts"]);
  return Promise.all(privateKeys.map((key, number) => new AttestationSpammer(key, number == 0).runSpammer()));
}

// (new AttestationSpammer()).runSpammer()
runAllAttestationSpammers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
