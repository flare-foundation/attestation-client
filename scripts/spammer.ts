import * as dotenv from 'dotenv';
import { AttestationType } from '../lib/AttestationData';
import { MCClient } from '../lib/MCC/MCClient';
import { ChainType, MCCNodeSettings } from '../lib/MCC/MCClientSettings';
import { AttestationRequest, toBN, TransactionAttestationRequest, txAttReqToAttestationRequest } from '../lib/MCC/tx-normalize';
import { getLogger, getWeb3, getWeb3Contract, getWeb3Wallet, sleep, waitFinalize3Factory } from '../lib/utils';
import { StateConnector } from '../typechain-web3-v1/StateConnector';

dotenv.config();
var yargs = require("yargs");

let args = yargs
  .option('chain', {
    alias: 'c',
    type: 'string',
    description: 'Chain',
    demand: false
  })
  .option('rpcLink', {
    alias: 'r',
    type: 'string',
    description: 'RPC to Flare network',
    default: "http://127.0.0.1:8545",
    demand: false
  })
  .option('abiPath', {
    alias: 'a',
    type: 'string',
    description: "Path to abi JSON file",
    default: 'artifacts/contracts/StateConnector.sol/StateConnector.json',
    demand: false
  })
  .option('contractAddress', {
    alias: 'c',
    type: 'string',
    description: "Address of the deployed contract",
    default: '0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F',   // default hardhat address when run with yarn stateconnector
    demand: false
  })
  .option('blockchainURL', {
    alias: 'u',
    type: 'string',
    description: "RPC url for blockchain",
    default: 'https://testnode2.c.aflabs.net/btc/',   
    demand: false
  })
  .option('blockchainUsername', {
    alias: 's',
    type: 'string',
    description: "Blockchain node username",
    default: 'rpcuser',
    demand: false
  })
  .option('blockchainPassword', {
    alias: 'p',
    type: 'string',
    description: "Blockchain node password",
    default: 'rpcpass',
    demand: false
  })
  .option('confirmations', {
    alias: 'f',
    type: 'number',
    description: "Number of confirmations",
    default: 6,
    demand: false
  })
  .option('range', {
    alias: 'w',
    type: 'number',
    description: 'Random block range',
    default: 1000
  })
  .option('delay', {
    alias: 'd',
    type: 'number',
    description: 'Delay between sending',
    default: 500
  })
  .argv;

const DEFAULT_GAS = "2500000";
const DEFAULT_GAS_PRICE = "225000000000";

class AttestationSpammer {
  chainType!: ChainType;
  client: any;
  web3!: Web3;
  account!: any;
  waitFinalize3!: any;
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
  

  constructor() {
    this.chainType = args['chain'];
    this.client = new MCClient(new MCCNodeSettings(this.chainType, this.URL, this.USERNAME || "", this.PASSWORD || "", null));
    this.web3 = getWeb3(this.rpcLink) as Web3;
    this.account = getWeb3Wallet(web3, this.privateKey);
    this.waitFinalize3 = waitFinalize3Factory(this.web3);
    this.logger = getLogger(`attester-spammer-${args['chain']}`);    
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
    let fnToEncode = stateConnector.methods.requestAttestations(request.instructions, request.id, request.dataAvailabilityProof)
    return await this.signAndFinalize3("Request attestation", this.stateConnector.options.address, fnToEncode);
  }

  async getNonce(): Promise<string> {
    let nonce = (await this.web3.eth.getTransactionCount(this.account.address));
    return nonce + "";   // string returned
  }

  async signAndFinalize3(label: string, toAddress: string, fnToEncode: any, gas: string = DEFAULT_GAS, gasPrice: string = DEFAULT_GAS_PRICE) {
    let nonce = await this.getNonce();
    var tx = {
      from: this.account.address,
      to: toAddress,
      gas: gas,
      gasPrice: gasPrice,
      data: fnToEncode.encodeABI(),
      nonce: nonce
    };
    var signedTx = await this.account.signTransaction(tx);

    try {
      let receipt = await this.waitFinalize3(this.account.address, () => this.web3.eth.sendSignedTransaction(signedTx.rawTransaction!));
      return receipt;
    } catch (e: any) {
      if (e.message.indexOf("Transaction has been reverted by the EVM") < 0) {
        this.logger.error(`${label} | Nonce sent: ${nonce} | signAndFinalize3 error: ${e.message}`);
      } else {
        fnToEncode.call({ from: this.account.address })
          .then((result: any) => { throw Error('unlikely to happen: ' + JSON.stringify(result)) })
          .catch((revertReason: any) => {
            this.logger.error(`${label} | Nonce sent: ${nonce} | signAndFinalize3 error: ${revertReason}`);
          });
      }
    }
  }

  async runSpammer() {    
    this.stateConnector = (await getWeb3Contract(web3, args['contractAddress'], "StateConnector")) as StateConnector;
    while (true) {
      let latestBlockNumber = await this.client.getBlockHeight();
      console.log(latestBlockNumber)
      let rangeMax = latestBlockNumber - this.confirmations;
      if (rangeMax < 0) {
        this.logger.info("Too small number of blocks.");
        await sleep(1000);
        continue;
      }
      let rangeMin = Math.max(0, latestBlockNumber - this.range - this.confirmations);
      let selectedBlock = Math.round(Math.random() * (rangeMax - rangeMin + 1));
      let block = await this.client.getBlock(selectedBlock);
      let confirmationBlock = await this.client.getBlock(selectedBlock + this.confirmations);
      for (let tx of this.client.getTransactionHashesFromBlock(block)) {
        console.log(tx);
        let attType = AttestationType.TransactionFull;
        let tr = {
          id: tx,
          dataAvailabilityProof: this.client.getBlockHash(confirmationBlock),
          blockNumber: selectedBlock,
          chainId: this.chainType,
          attestationType: attType,
          instructions: toBN(0)
        } as TransactionAttestationRequest;
        let attRequest = txAttReqToAttestationRequest(tr);
        let receipt = await this.sendAttestationRequest(this.stateConnector, attRequest);
        await sleep(this.delay);
      }
      // expectEvent(receipt, "AttestationRequest")
      // let events = extractAttEvents(receipt.logs);
      // let parsedEvents =  events.map((x: AttestationRequest) => attReqToTransactionAttestationRequest(x))
      // assert(parsedEvents.length === 1);
      // let parsedEvent = parsedEvents[0];
      // assert((parsedEvent.blockNumber as BN).eq(toBN(tr.blockNumber as number)), "Block number does not match");
      // assert((parsedEvent.chainId as BN).eq(toBN(tr.chainId as number)), "Chain id  does not match");
      // assert((parsedEvent.utxo as BN).eq(toBN(0)), "Utxo does not match");
      // assert(parsedEvent.attestationType === attType, "Attestation t    
    }
  }
};


(new AttestationSpammer()).runSpammer()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });






