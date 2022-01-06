import * as dotenv from 'dotenv';
import { AttestationType } from '../lib/AttestationData';
import { MCClient } from '../lib/MCC/MCClient';
import { ChainType, MCCNodeSettings } from '../lib/MCC/MCClientSettings';
import { AttestationRequest, TransactionAttestationRequest, txAttReqToAttestationRequest } from '../lib/MCC/tx-normalize';
import { getLogger, getWeb3, getWeb3Contract, getWeb3Wallet, sleep, toBN, waitFinalize3Factory } from '../lib/utils';
import { StateConnector } from '../typechain-web3-v1/StateConnector';
import Web3 from "web3";
import { Web3Functions } from '../lib/Web3Functions';

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
  .option('privateKey', {
    alias: 'k',
    type: 'string',
    description: 'Private key for sending attester requests',
    default: '0xc5e8f61d1ab959b397eecc0a37a6517b8e67a0e7cf1f4bce5591f3ed80199122'
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
  .option('loggerLabel', {
    alias: 'l',
    type: 'string',
    description: "Logger label",
    default: ''
  })
  .argv;

class AttestationSpammer {
  chainType!: ChainType;
  client: any;
  web3!: Web3;
  logger!: any;
  stateConnector!: StateConnector;
  range: number = args['range'];
  rpcLink: string = args['rpcLink'];

  URL: string = args['blockchainURL'];
  USERNAME?: string = args['blockchainUsername'];
  PASSWORD?: string = args['blockchainPassword'];
  confirmations: number = args['confirmations'];
  privateKey: string = args['privateKey'];

  delay: number = args['delay'];
  lastBlockNumber: number = -1;
  web3Functions!: Web3Functions;

  constructor() {
    this.chainType = this.getChainType(args['chain']);
    let mccClient = new MCClient(new MCCNodeSettings(this.chainType, this.URL, this.USERNAME || "", this.PASSWORD || "", null));
    this.client = mccClient.chainClient;
    this.logger = getLogger(args['loggerLabel']);
    this.web3 = getWeb3(this.rpcLink) as Web3;
    this.web3Functions = new Web3Functions(this.logger, this.web3, this.privateKey);

    console.log( args );

    getWeb3Contract(this.web3, args['contractAddress'], "StateConnector")
      .then((sc: StateConnector) => {
        this.stateConnector = sc;
      })
  }

  getChainType(chain: string) {
    if (!chain) {
      throw new Error("Chain missing")
    }
    switch (chain) {
      case "XRP":
        return ChainType.XRP;
      case "BTC":
        return ChainType.BTC;
      case "LTC":
        return ChainType.LTC;
      case "DOGE":
        return ChainType.DOGE;
      default:
        throw new Error(`Unsupported chain type ${chain}`)
    }
  }

  async sendAttestationRequest(stateConnector: StateConnector, request: AttestationRequest) {
    let fnToEncode = stateConnector.methods.requestAttestations(request.instructions, request.dataHash, request.id, request.dataAvailabilityProof)
    const receipt = await this.web3Functions.signAndFinalize3("Request attestation", this.stateConnector.options.address, fnToEncode);

    if (receipt) {
      this.logger.info(`Attestation sent`)
    }

    return receipt;
  }

  async waitForStateConnector() {
    while (!this.stateConnector) {
      await sleep(100);
    }
  }

  async logEvents(maxBlockFetch = 100) {
    await this.waitForStateConnector();
    this.lastBlockNumber = await this.web3.eth.getBlockNumber()
    let firstUnprocessedBlockNumber = this.lastBlockNumber;
    while (true) {
      await sleep(500);
      try {
        let last = Math.min(firstUnprocessedBlockNumber + maxBlockFetch, this.lastBlockNumber);
        if (firstUnprocessedBlockNumber > last) {
          this.lastBlockNumber = await this.web3.eth.getBlockNumber();
          continue;
        }
        let events = await this.stateConnector.getPastEvents(
          "AttestationRequest",
          {
            fromBlock: firstUnprocessedBlockNumber,
            toBlock: last
          })
        this.logger.info(`Processing ${events.length} events from block ${firstUnprocessedBlockNumber} to ${last}`);
        firstUnprocessedBlockNumber = last + 1;
      } catch (e) {
        this.logger.info(`Error: ${e}`)
      }
    }
  }

  async runSpammer() {
    await this.waitForStateConnector();
    console.log(`private key=${this.privateKey}`);
    this.logEvents();  // async run
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
            dataHash: "0x0",
            dataAvailabilityProof: this.client.getBlockHash(confirmationBlock),
            blockNumber: selectedBlock,
            chainId: this.chainType,
            attestationType: attType,
            instructions: toBN(0)
          } as TransactionAttestationRequest;
          let attRequest = txAttReqToAttestationRequest(tr);
          await this.sendAttestationRequest(this.stateConnector, attRequest); // async call
          await sleep(this.delay);
        }
      } catch (e) {
        this.logger.error(`ERROR: ${e}`)
      }
    }
  }
};

(new AttestationSpammer()).runSpammer()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });






