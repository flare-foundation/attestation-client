// //
// //
// //  [ ] proof of existance (tx reference, destination address, amount)
// //
// //  block (from -14d up to -6 blocks)
// //     - block number
// //     - block hash
// //     - block timestamp
// //     - response
// //
// //  transaction
// //     - payment reference (non unique!!!) hex string 32 chars (hex lower case)
// //     - transaction id
// //     - timestamp
// //     - block number
// //     - response
// //
// //  [ ] XRP 1st
// //  [ ] 100% make sure that block is completely saved until moved to the next block
// //  [ ]

// import * as dotenv from "dotenv";
// import { ChainType, MCC, sleep, toBN } from "flare-mcc";
// import { RPCInterface } from "flare-mcc/dist/types";
// import Web3 from "web3";
// import { StateConnector } from "../../typechain-web3-v1/StateConnector";
// import { AttLogger, getGlobalLogger } from "../utils/logger";
// import { getWeb3, getWeb3Contract, round } from "../utils/utils";
// import { Web3Functions } from "../utils/Web3Functions";
// import { buildAttestationRequest } from "../verification/attestation-request-utils";
// import { ChainVerification, TransactionAttestationRequest, VerificationStatus } from "../verification/attestation-types/attestation-types";
// import { AttestationType } from "../verification/generated/attestation-types-enum";
// import { verifyTransactionAttestation } from "../verification/verification";
// let fs = require("fs");

// const DEBUG_REPEATS = 1;

// dotenv.config();
// var yargs = require("yargs");

// let args = yargs
//   .option("chain", {
//     alias: "c",
//     type: "string",
//     description: "Chain (XRP, BTC, LTC, DOGE)",
//     default: "ALGO",
//   })
//   .option("rpcLink", {
//     alias: "r",
//     type: "string",
//     description: "RPC to Flare network",
//     default: "http://127.0.0.1:9650/ext/bc/C/rpc",
//   })
//   .option("abiPath", {
//     alias: "a",
//     type: "string",
//     description: "Path to abi JSON file",
//     default: "artifacts/contracts/StateConnector.sol/StateConnector.json",
//   })
//   .option("contractAddress", {
//     alias: "t",
//     type: "string",
//     description: "Address of the deployed contract",
//     default: "0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F", // default hardhat address when run with yarn stateconnector
//   })
//   .option("blockchainURL", {
//     alias: "u",
//     type: "string",
//     description: "RPC url for blockchain",
//     default: "http://testnode3.c.aflabs.net:4001/",
//   })
//   .option("blockchainUsername", {
//     alias: "s",
//     type: "string",
//     description: "Blockchain node username",
//     default: "rpcuser",
//   })
//   .option("blockchainPassword", {
//     alias: "p",
//     type: "string",
//     description: "Blockchain node password",
//     default: "rpcpass",
//   })
//   .option("blockchainToken", {
//     alias: "h",
//     type: "string",
//     description: "Blockchain node access token",
//     default: "7f90419ceab8fde42b2bd50c44ed21c0aefebc614f73b27619549f366b060a14",
//   })
//   .option("blockchainIndexerURL", {
//     alias: "i",
//     type: "string",
//     description: "RPC url for indexer (algo only)",
//     default: "http://testnode3.c.aflabs.net:8980/",
//   })
//   .option("blockchainIndexerToken", {
//     alias: "j",
//     type: "string",
//     description: "Blockchain access token for indexer (algo only)",
//     default: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadddd",
//   })
//   .option("confirmations", {
//     alias: "f",
//     type: "number",
//     description: "Number of confirmations",
//     default: 6,
//   })
//   .option("range", {
//     alias: "w",
//     type: "number",
//     description: "Random block range",
//     default: 1000,
//   })
//   .option("nonceResetCount", {
//     alias: "e",
//     type: "number",
//     description: "Reset nonce period",
//     default: 10,
//   })
//   .option("delay", {
//     alias: "d",
//     type: "number",
//     description: "Delay between sending transactions from the same block",
//     default: 500,
//   })
//   .option("accountsFile", {
//     alias: "k",
//     type: "string",
//     description: "Private key accounts file",
//     default: "test-1020-accounts.json",
//   })
//   .option("startAccountId", {
//     alias: "b",
//     type: "number",
//     description: "Start account id",
//     default: 0,
//   })
//   .option("numberOfAccounts", {
//     alias: "o",
//     type: "number",
//     description: "Number of accounts",
//     default: 1,
//   })
//   .option("loggerLabel", {
//     alias: "l",
//     type: "string",
//     description: "Logger label",
//     default: "",
//   })
//   .option("databaseFile", {
//     alias: "g",
//     type: "string",
//     description: "Database file",
//     default: "",
//   }).argv;

// class AttestationCollector {
//   chainType!: ChainType;
//   client!: RPCInterface;
//   web3!: Web3;
//   logger!: AttLogger;
//   stateConnector!: StateConnector;
//   range: number = args["range"];
//   rpcLink: string = args["rpcLink"];

//   URL: string = args["blockchainURL"];
//   USERNAME?: string = args["blockchainUsername"];
//   PASSWORD?: string = args["blockchainPassword"];
//   confirmations: number = args["confirmations"];
//   privateKey: string;
//   delay: number = args["delay"];
//   lastBlockNumber: number = -1;
//   web3Functions!: Web3Functions;
//   logEvents: boolean;

//   static sendCount = 0;
//   static txCount = 0;
//   static valid = 0;
//   static invalid = 0;
//   static failed = 0;
//   static retry = 0;

//   constructor(privateKey: string, logEvents = true) {
//     this.logger = getGlobalLogger(args["loggerLabel"]);
//     this.privateKey = privateKey;
//     this.logEvents = logEvents;
//     this.chainType = MCC.getChainType(args["chain"]);
//     switch (this.chainType) {
//       case ChainType.BTC:
//       case ChainType.LTC:
//       case ChainType.DOGE:
//         this.client = MCC.Client(this.chainType, {
//           url: this.URL,
//           username: this.USERNAME,
//           password: this.PASSWORD,
//           rateLimitOptions: {
//             maxRPS: 50,
//             timeoutMs: 3000,
//             onSend: this.onSend.bind(this),
//             onResponse: this.onResponse.bind(this),
//             onLimitReached: this.limitReached.bind(this),
//             onRetry: this.onRetry.bind(this),
//           },
//         }) as RPCInterface;
//         break;
//       case ChainType.XRP:
//         this.client = MCC.Client(this.chainType, {
//           url: this.URL,
//           username: this.USERNAME,
//           password: this.PASSWORD,
//           rateLimitOptions: {
//             maxRPS: 50,
//             timeoutMs: 3000,
//             onSend: this.onSend.bind(this),
//             onResponse: this.onResponse.bind(this),
//             onLimitReached: this.limitReached.bind(this),
//           },
//         }) as RPCInterface;
//         break;
//       case ChainType.ALGO:
//         const algoCreateConfig = {
//           algod: {
//             url: args["blockchainURL"],
//             token: args["blockchainToken"],
//           },
//           indexer: {
//             url: args["blockchainIndexerURL"],
//             token: args["blockchainIndexerToken"],
//           },
//         };
//         this.client = MCC.Client(this.chainType, algoCreateConfig) as RPCInterface;
//         break;
//       default:
//         throw new Error("");
//     }

//     // let mccClient = new MCClient(new MCCNodeSettings(this.chainType, this.URL, this.USERNAME || "", this.PASSWORD || "", null));
//     this.web3 = getWeb3(this.rpcLink) as Web3;
//     this.web3Functions = new Web3Functions(this.logger, this.web3, this.privateKey);

//     getWeb3Contract(this.web3, args["contractAddress"], "StateConnector").then((sc: StateConnector) => {
//       this.stateConnector = sc;
//     });
//   }

//   maxQueue = 5;
//   wait: boolean = false;

//   limitReached(inProcessing?: number, inQueue?: number) {}

//   onSend(inProcessing?: number, inQueue?: number) {
//     //this.logger.info(`Send ${inProcessing} ${inQueue}`);
//     this.wait = inQueue! >= this.maxQueue;

//     AttestationCollector.txCount++;
//   }

//   onRetry(retryCount?: number) {
//     //this.logger.info(`retry ${retryCount}`);
//     AttestationCollector.retry++;
//   }

//   onResponse(inProcessing?: number, inQueue?: number) {
//     //this.logger.info(`Response ${inProcessing} ${inQueue} ${AttestationCollector.txCount}`);
//     this.wait = inQueue! >= this.maxQueue;
//   }

//   async waitForStateConnector() {
//     while (!this.stateConnector) {
//       await sleep(100);
//     }
//   }

//   async syncBlocks() {
//     while (true) {
//       try {
//         let last = this.lastBlockNumber;
//         this.lastBlockNumber = await this.web3.eth.getBlockNumber();
//         // if(this.lastBlockNumber > last) {
//         //   this.logger.info(`Last block: ${this.lastBlockNumber}`)
//         // }
//         await sleep(200);
//       } catch (e) {
//         this.logger.info(`Error: ${e}`);
//       }
//     }
//   }
//   async startLogEvents(maxBlockFetch = 100) {
//     await this.waitForStateConnector();
//     this.lastBlockNumber = await this.web3.eth.getBlockNumber();
//     let firstUnprocessedBlockNumber = this.lastBlockNumber;
//     this.syncBlocks();
//     while (true) {
//       await sleep(200);
//       try {
//         let last = Math.min(firstUnprocessedBlockNumber + maxBlockFetch, this.lastBlockNumber);
//         if (firstUnprocessedBlockNumber > last) {
//           continue;
//         }
//         let events = await this.stateConnector.getPastEvents("AttestationRequest", {
//           fromBlock: firstUnprocessedBlockNumber,
//           toBlock: last,
//         });
//         this.logger.info(`Receiving ${events.length} events from block ${firstUnprocessedBlockNumber} to ${last}`);
//         firstUnprocessedBlockNumber = last + 1;
//       } catch (e) {
//         this.logger.info(`Error: ${e}`);
//       }
//     }
//   }

//   async runCollector() {
//     await this.waitForStateConnector();
//     if (this.logEvents) {
//       this.startLogEvents(); // async run
//     }
//     const fs = require("fs");
//     while (true) {
//       try {
//         // create process that will collect valid transactions
//         let latestBlockNumber = await this.client.getBlockHeight();
//         let rangeMax = latestBlockNumber - this.confirmations;
//         if (rangeMax < 0) {
//           this.logger.info("Too small number of blocks.");
//           await sleep(100);
//           continue;
//         }
//         let rangeMin = Math.max(0, latestBlockNumber - this.range - this.confirmations);
//         let selectedBlock = Math.round(Math.random() * (rangeMax - rangeMin + 1)) + rangeMin;
//         let block = await this.client.getBlock(selectedBlock).catch((error: any) => {
//           console.log(`1`);
//           throw error;
//         });
//         let confirmationBlock = await this.client.getBlock(selectedBlock + this.confirmations).catch((error: any) => {
//           console.log(`2`);
//           throw error;
//         });
//         let hashes = await this.client.getTransactionHashesFromBlock(block).catch((error: any) => {
//           console.log(`3`);
//           throw error;
//         });
//         for (let tx of hashes) {
//           let attType = AttestationType.Payment;
//           let tr = {
//             id: tx,
//             dataAvailabilityProof: await this.client.getBlockHash(confirmationBlock).catch((error: any) => {
//               console.log(`3`);
//               throw error;
//             }),
//             blockNumber: selectedBlock,
//             chainId: this.chainType,
//             attestationType: attType,
//             instructions: toBN(0),
//           } as TransactionAttestationRequest;

//           const attRequest = buildAttestationRequest(tr);

//           // duplicate requests so that looks like many verifications
//           for (let a = 0; a < DEBUG_REPEATS; a++) {
//             //this.logger.info("verifyTransactionAttestation");
//             verifyTransactionAttestation(this.client, tr, { skipDataAvailabilityProof: true })
//               .then((txData: ChainVerification) => {
//                 // save
//                 const data = JSON.stringify(attRequest) + ",\n";
//                 if (txData.verificationStatus === VerificationStatus.OK) {
//                   // this.logger.info("   verified");
//                   if (a === 0) {
//                     AttestationCollector.valid++;
//                     fs.appendFileSync(`db/transactions.${args.loggerLabel}.valid.json`, data);
//                   }
//                 } else {
//                   // this.logger.info(`refused ${attType},${txData.verificationStatus}`, );
//                   if (a === 0) {
//                     AttestationCollector.invalid++;
//                     fs.appendFileSync(`db/transactions.${args.loggerLabel}.invalid.json`, data);
//                   }
//                 }
//               })
//               .catch((error) => {
//                 AttestationCollector.failed++;
//                 // skip
//                 if (!error.message.endsWith("property 'message' of undefined")) {
//                   console.log(`ERROR1 ${error}`);
//                 }
//               });

//             AttestationCollector.sendCount++;

//             await sleep(5);

//             while (this.wait) {
//               await sleep(5);
//             }
//           }
//         }
//       } catch (e) {
//         this.logger.error(`ERROR2: ${e}`);
//       }
//       // must wait a bit - traffic control
//     }
//   }
// }

// async function displayStats() {
//   const period = 10000;

//   const logger = getGlobalLogger(args["loggerLabel"]);

//   while (true) {
//     await sleep(period);

//     logger.info(
//       `^Y${round((AttestationCollector.sendCount * 1000) / period, 1)} req/sec  ${round((AttestationCollector.txCount * 1000) / period, 1)} tx/sec (${round(
//         AttestationCollector.txCount / AttestationCollector.sendCount,
//         1
//       )} tx/req)   valid ${AttestationCollector.valid} invalid ${AttestationCollector.invalid} failed ${AttestationCollector.failed} retry  ${
//         AttestationCollector.retry
//       }`
//     );
//     AttestationCollector.sendCount = 0;
//     AttestationCollector.txCount = 0;
//     AttestationCollector.failed = 0;
//     AttestationCollector.retry = 0;
//   }
// }

// async function runAllAttestationCollectors() {
//   displayStats();

//   const accounts = JSON.parse(fs.readFileSync(args["accountsFile"]));
//   const privateKeys: string[] = accounts.map((x: any) => x.privateKey).slice(args["startAccountId"], args["startAccountId"] + args["numberOfAccounts"]);
//   return Promise.all(privateKeys.map((key, number) => new AttestationCollector(key, number == 0).runCollector()));
// }

// // (new AttestationSpammer()).runSpammer()
// runAllAttestationCollectors()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
