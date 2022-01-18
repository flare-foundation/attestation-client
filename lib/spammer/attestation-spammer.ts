import * as dotenv from 'dotenv';
import Web3 from "web3";
import { AttestationType } from '../AttestationData';
import { getGlobalLogger } from '../logger';
import { AttestationRequest, TransactionAttestationRequest, txAttReqToAttestationRequest } from '../verification/Verification';
import { getWeb3, getWeb3Contract } from '../utils';
import { Web3Functions } from '../Web3Functions';
import { StateConnector } from '../../typechain-web3-v1/StateConnector';
import { MCC } from '../MCC';
import { ChainType, RPCInterface } from '../MCC/types';
import { sleep, toBN } from '../MCC/utils';

let fs = require('fs');

dotenv.config();
var yargs = require("yargs");

let args = yargs
  .option('chain', {
    alias: 'c',
    type: 'string',
    description: 'Chain (XRP, BTC, LTC, DOGE)',
    default: 'XRP'
  })
  .option('rpcLink', {
    alias: 'r',
    type: 'string',
    description: 'RPC to Flare network',
    default: "http://127.0.0.1:9650/ext/bc/C/rpc"
  })
  .option('abiPath', {
    alias: 'a',
    type: 'string',
    description: "Path to abi JSON file",
    default: 'artifacts/contracts/StateConnector.sol/StateConnector.json'
  })
  .option('contractAddress', {
    alias: 't',
    type: 'string',
    description: "Address of the deployed contract",
    default: '0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F'   // default hardhat address when run with yarn stateconnector
  })
  .option('blockchainURL', {
    alias: 'u',
    type: 'string',
    description: "RPC url for blockchain",
    default: 'https://xrplcluster.com'
  })
  .option('blockchainUsername', {
    alias: 's',
    type: 'string',
    description: "Blockchain node username",
    default: 'rpcuser'
  })
  .option('blockchainPassword', {
    alias: 'p',
    type: 'string',
    description: "Blockchain node password",
    default: 'rpcpass'
  })
  .option('blockchainToken', {
    alias: 'h',
    type: 'string',
    description: "Blockchain node access token",
    default: ''
  })

  .option('blockchainIndexerURL', {
    alias: 'i',
    type: 'string',
    description: "RPC url for indexer (algo only)",
    default: 'http://testnode3.c.aflabs.net:8980/'
  })
  .option('blockchainIndexerToken', {
    alias: 'j',
    type: 'string',
    description: "Blockchain access token for indexer (algo only)",
    default: ''
  })


  .option('confirmations', {
    alias: 'f',
    type: 'number',
    description: "Number of confirmations",
    default: 6
  })
  .option('range', {
    alias: 'w',
    type: 'number',
    description: 'Random block range',
    default: 1000
  })
  .option('nonceResetCount', {
    alias: 'e',
    type: 'number',
    description: 'Reset nonce period',
    default: 10
  })
  .option('delay', {
    alias: 'd',
    type: 'number',
    description: 'Delay between sending transactions from the same block',
    default: 500
  })
  .option('accountsFile', {
    alias: 'k',
    type: 'string',
    description: 'Private key accounts file',
    default: 'test-1020-accounts.json'
  })
  .option('startAccountId', {
    alias: 'b',
    type: 'number',
    description: 'Start account id',
    default: 0
  })
  .option('numberOfAccounts', {
    alias: 'o',
    type: 'number',
    description: 'Number of accounts',
    default: 1
  })
  .option('loggerLabel', {
    alias: 'l',
    type: 'string',
    description: "Logger label",
    default: ''
  })
  .option('databaseFile', {
    alias: 'g',
    type: 'string',
    description: "Database file",
    default: ''
  })
  .argv;

class AttestationSpammer {
  chainType!: ChainType;
  client!: RPCInterface;
  web3!: Web3;
  logger!: any;
  stateConnector!: StateConnector;
  range: number = args['range'];
  rpcLink: string = args['rpcLink'];

  URL: string = args['blockchainURL'];
  USERNAME?: string = args['blockchainUsername'];
  PASSWORD?: string = args['blockchainPassword'];
  confirmations: number = args['confirmations'];
  privateKey: string;
  delay: number = args['delay'];
  lastBlockNumber: number = -1;
  web3Functions!: Web3Functions;
  logEvents: boolean;


  constructor(privateKey: string, logEvents = true) {
    this.privateKey = privateKey;
    this.logEvents = logEvents;
    this.chainType = MCC.getChainType(args['chain']);
    switch(this.chainType) {
      case ChainType.BTC: 
      case ChainType.LTC:
      case ChainType.DOGE: 
        this.client  = MCC.Client(this.chainType, {url: this.URL, username: this.USERNAME, password: this.PASSWORD}) as RPCInterface;
        break;
      case ChainType.XRP:
        this.client  = MCC.Client(this.chainType, {url: this.URL, username: this.USERNAME, password: this.PASSWORD}) as RPCInterface;
        break;
      case ChainType.ALGO:
        const algoCreateConfig = {
          algod: {
              url: args['blockchainURL'],
              token: args['blockchainToken'],
          },
          indexer: {
              url: args['blockchainIndexerURL'],
              token: args['blockchainIndexerToken'],
          },
      };
        this.client  = MCC.Client(this.chainType, algoCreateConfig) as RPCInterface;
        break;
      default:
        throw new Error("")
    }

    // let mccClient = new MCClient(new MCCNodeSettings(this.chainType, this.URL, this.USERNAME || "", this.PASSWORD || "", null));
    this.logger = getGlobalLogger(args['loggerLabel']);
    this.web3 = getWeb3(this.rpcLink) as Web3;
    this.web3Functions = new Web3Functions(this.logger, this.web3, this.privateKey);

    getWeb3Contract(this.web3, args['contractAddress'], "StateConnector")
      .then((sc: StateConnector) => {
        this.stateConnector = sc;
      })
  }

  async sendAttestationRequest(stateConnector: StateConnector, request: AttestationRequest) {
    let fnToEncode = stateConnector.methods.requestAttestations(request.instructions, request.id, request.dataAvailabilityProof)
    const receipt = await this.web3Functions.signAndFinalize3("Request attestation", this.stateConnector.options.address, fnToEncode);

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

  async syncBlocks() {
    while (true) {
      try {
        let last = this.lastBlockNumber;
        this.lastBlockNumber = await this.web3.eth.getBlockNumber();
        // if(this.lastBlockNumber > last) {
        //   this.logger.info(`Last block: ${this.lastBlockNumber}`)  
        // }
        await sleep(200);
      } catch (e) {
        this.logger.info(`Error: ${e}`)
      }
    }
  }
  async startLogEvents(maxBlockFetch = 100) {
    await this.waitForStateConnector();
    this.lastBlockNumber = await this.web3.eth.getBlockNumber()
    let firstUnprocessedBlockNumber = this.lastBlockNumber;
    this.syncBlocks()
    while (true) {
      await sleep(200);
      try {
        let last = Math.min(firstUnprocessedBlockNumber + maxBlockFetch, this.lastBlockNumber);
        if (firstUnprocessedBlockNumber > last) {
          continue;
        }
        let events = await this.stateConnector.getPastEvents(
          "AttestationRequest",
          {
            fromBlock: firstUnprocessedBlockNumber,
            toBlock: last
          })
        this.logger.info(`Receiving ${events.length} events from block ${firstUnprocessedBlockNumber} to ${last}`);
        firstUnprocessedBlockNumber = last + 1;
      } catch (e) {
        this.logger.info(`Error: ${e}`)
      }
    }
  }

  async runSpammer() {
    await this.waitForStateConnector();
    if (this.logEvents) {
      this.startLogEvents();  // async run
    }
    while (true) {
      try {
        let latestBlockNumber = await this.client.getBlockHeight();
        let rangeMax = latestBlockNumber - this.confirmations;
        if (rangeMax < 0) {
          this.logger.info("Too small number of blocks.");
          await sleep(1000);
          continue;
        }
        let rangeMin = Math.max(0, latestBlockNumber - this.range - this.confirmations);
        let selectedBlock = Math.round(Math.random() * (rangeMax - rangeMin + 1)) + rangeMin;
        let block = await this.client.getBlock(selectedBlock);
        let confirmationBlock = await this.client.getBlock(selectedBlock + this.confirmations);
        for (let tx of this.client.getTransactionHashesFromBlock(block)) {
          let attType = AttestationType.FassetPaymentProof;
          let tr = {
            id: tx,
            dataAvailabilityProof: this.client.getBlockHash(confirmationBlock),
            blockNumber: selectedBlock,
            chainId: this.chainType,
            attestationType: attType,
            instructions: toBN(0)
          } as TransactionAttestationRequest;
          let attRequest = txAttReqToAttestationRequest(tr);
          await this.sendAttestationRequest(this.stateConnector, attRequest); // async call
          await sleep(Math.floor(Math.random() * this.delay));
        }
      } catch (e) {
        this.logger.error(`ERROR: ${e}`)
      }
    }
  }
};

async function runAllAttestationSpammers() {
  const accounts = JSON.parse(fs.readFileSync(args['accountsFile']));
  const privateKeys: string[] = accounts.map((x: any) => x.privateKey).slice(args['startAccountId'], args['startAccountId'] + args['numberOfAccounts'])
  return Promise.all(privateKeys.map((key, number) => (new AttestationSpammer(key, number == 0)).runSpammer()))
}



// (new AttestationSpammer()).runSpammer()
runAllAttestationSpammers()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });





