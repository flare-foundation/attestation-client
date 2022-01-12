import { ensure_data, sleep, toBN, SATOSHI_BTC, prefix0x } from './utils';
import BN from 'bn.js';

import axios from 'axios';
import {
  IUtxoWalletRes,
  getAddressByLabelResponse,
  getTransactionOptions,
  IUtxoGetTransactionRes,
  IUtxoTransactionListRes,
  IIUtxoVin,
  IIUtxoVout,
  IUtxoBlockHeaderRes,
  IUtxoBlockRes,
  AdditionalTransactionDetails,
  AdditionalTxRequest,
} from './types';

export class UtxoCore {
  client: any;
  inRegTest: boolean;

  constructor(url: string, username: string, password: string, inRegTest: boolean = false) {
    this.client = axios.create({
      baseURL: url,
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' },
      auth: {
        username: username,
        password: password,
      },
      validateStatus: function (status: number) {
        return (status >= 200 && status < 300) || status == 500;
      },
    });
    this.inRegTest = inRegTest;
  }

  /**
   * Get transaction details
   * @param txId Transaction id
   * @param options provide verbose:boolean, set true if you want more info such as block hash...
   * @returns transaction details
   */
  async getTransaction(txId: string, options?: getTransactionOptions): Promise<IUtxoGetTransactionRes | string | any> {
    let verbose = false;
    if (options !== undefined) {
      verbose = options.verbose || false;
    }
    let res = await this.client.post('', {
      jsonrpc: '1.0',
      id: 'rpc',
      method: 'getrawtransaction',
      params: [txId, verbose],
    });
    ensure_data(res.data);
    return res.data.result;
  }

  /**
   * Get Block height (number of blocks) from connected chain
   * @returns block height (block count)
   */
  async getBlockHeight(): Promise<number> {
    let res = await this.client.post('', {
      jsonrpc: '1.0',
      id: 'rpc',
      method: 'getblockcount',
      params: [],
    });
    ensure_data(res.data);
    return res.data.result;
  }

  async isHealthy() {
    // WIP
    return true;
  }

  /**
   * Get header information about the block
   * @param blockHash
   * @returns
   */
  async getBlockHeader(blockHashOrHeight: string | number): Promise<IUtxoBlockHeaderRes> {
    let blockHash: string | null = null;
    if (typeof blockHashOrHeight === 'string') {
      blockHash = blockHashOrHeight as string;
    } else if (typeof blockHashOrHeight === 'number') {
      blockHash = await this.getBlockHashFromHeight(blockHashOrHeight as number);
    }
    let res = await this.client.post('', {
      jsonrpc: '1.0',
      id: 'rpc',
      method: 'getblockheader',
      params: [blockHash],
    });
    ensure_data(res.data);
    return res.data.result;
  }

  /**
   * Gets the block from main mining tip with provided height
   * @param blockNumber Block height
   * @returns Block hash
   */
  async getBlockHashFromHeight(blockNumber: number): Promise<string> {
    let res = await this.client.post('', {
      jsonrpc: '1.0',
      id: 'rpc',
      method: 'getblockhash',
      params: [blockNumber],
    });
    ensure_data(res.data);
    return res.data.result as string;
  }

  /**
   * Returns the block information
   * @param blockHashOrHeight Provide either block hash or height of the block
   * @returns All available block information
   */
  async getBlock(blockHashOrHeight: string | number): Promise<IUtxoBlockRes> {
    let blockHash: string | null = null;
    if (typeof blockHashOrHeight === 'string') {
      blockHash = blockHashOrHeight as string;
    } else if (typeof blockHashOrHeight === 'number') {
      blockHash = await this.getBlockHashFromHeight(blockHashOrHeight as number);
    }
    let res = await this.client.post('', {
      jsonrpc: '1.0',
      id: 'rpc',
      method: 'getblock',
      params: [blockHash],
    });
    ensure_data(res.data);
    return res.data.result as IUtxoBlockRes;
  }

  /**
   * Creates a new wallet on node's database
   * @param walletLabel label of your wallet used as a reference for future use
   * @returns name of the created wallet and possible warnings
   */
  async createWallet(walletLabel: string): Promise<IUtxoWalletRes> {
    let res = await this.client.post('', {
      jsonrpc: '1.0',
      id: 'rpc',
      method: 'createwallet',
      params: [walletLabel],
    });
    ensure_data(res.data);
    // TODO try to import wallet if it already exists but is not imported
    return res.data.result;
  }

  /**
   * loads the wallet if it exist on node, but it has to be relisted
   * @param walletLabel wallet label to load
   * @returns
   */
  async loadWallet(walletLabel: string): Promise<IUtxoWalletRes> {
    let res = await this.client.post('', {
      jsonrpc: '1.0',
      id: 'rpc',
      method: 'loadwallet',
      params: [walletLabel],
    });
    ensure_data(res.data);
    return res.data.result;
  }

  /**
   *
   * @param walletLabel label of wallet, if you dont have one create one with createWallet
   * @param label label of address within wallet (default to "")
   * @param address_type type of address (default to "legacy") options = ["legacy", "p2sh-segwit", "bech32"]
   * @returns
   */
  async createAddress(walletLabel: string, addressLabel: string = '', address_type: string = 'legacy') {
    let res = await this.client.post(`wallet/${walletLabel}`, {
      jsonrpc: '1.0',
      id: 'rpc',
      method: 'getnewaddress',
      params: [addressLabel, address_type],
    });
    ensure_data(res.data);
    return res.data.result;
  }

  /**
   * List all wallets on node
   * @returns
   */
  async listAllWallets(): Promise<string[]> {
    let res = await this.client.post(``, {
      jsonrpc: '1.0',
      id: 'rpc',
      method: 'listwallets',
      params: [],
    });
    ensure_data(res.data);
    return res.data.result;
  }

  /**
   * List all addresses by their label on provided wallet
   * @param walletLabel label of the parent wallet we want to list addresses
   * @param addressLabel label of the addresses we want to list
   * @returns
   */
  async listAllAddressesByLabel(walletLabel: string, addressLabel: string = ''): Promise<getAddressByLabelResponse[]> {
    let res = await this.client.post(`wallet/${walletLabel}`, {
      jsonrpc: '1.0',
      id: 'rpc',
      method: 'getaddressesbylabel',
      params: [addressLabel],
    });
    ensure_data(res.data);
    let address_labels = Object.keys(res.data.result);
    let response_array: getAddressByLabelResponse[] = [];
    for (let addL of address_labels) {
      response_array.push({ address: addL, purpose: res.data.result[addL].purpose });
    }
    return response_array;
  }

  /**
   * List all unspend transactions that happened between min and max blocks before current block
   * If we are in block 1000 and set min to 10 and max to 40 we will get all transactions that happened
   * between block 60 and 90
   * @param walletLabel
   * @param min min block offset
   * @param max max block offset
   * @returns
   */
  async listUnspentTransactions(walletLabel: string, min: number = 0, max: number = 1e6): Promise<IUtxoTransactionListRes[]> {
    let res = await this.client.post(`wallet/${walletLabel}`, {
      jsonrpc: '1.0',
      id: 'rpc',
      method: 'listunspent',
      params: [min, max],
    });
    ensure_data(res.data);
    return res.data.result;
  }

  async createRawTransaction(walletLabel: string, vin: IIUtxoVin[], out: IIUtxoVout[]) {
    let voutArr = '[';
    let first = true;
    for (let i of out) {
      if (first) {
        first = false;
      } else {
        voutArr += ',';
      }
      let row = `{"${i.address}" : ${i.amount}}`;
      voutArr += row;
    }
    voutArr += ']';
    let VoutArr = JSON.parse(voutArr);
    let res = await this.client.post(`wallet/${walletLabel}`, {
      jsonrpc: '1.0',
      id: 'rpc',
      method: 'createrawtransaction',
      params: [vin, VoutArr],
    });
    ensure_data(res.data);
    return res.data.result;
  }

  async signRawTransaction(walletLabel: string, rawTx: string, keysList: string[]) {
    let res = await this.client.post(`wallet/${walletLabel}`, {
      jsonrpc: '1.0',
      id: 'rpc',
      method: 'signrawtransactionwithkey',
      params: [rawTx, keysList],
    });
    ensure_data(res.data);
    return res.data.result;
  }

  /**
   * Send raw transaction
   * @param walletLabel the label of the wallet we are sending the transaction from
   * @param signedRawTx hash of signed transaction
   * @returns transaction sending status
   */
  async sendRawTransaction(walletLabel: string, signedRawTx: string) {
    let res = await this.client.post(`wallet/${walletLabel}`, {
      jsonrpc: '1.0',
      id: 'rpc',
      method: 'sendrawtransaction',
      params: [signedRawTx],
    });
    ensure_data(res.data);
    return res.data.result;
  }

  /**
   * Send raw transaction and wait for it to be in next block
   * @param walletLabel the label of the wallet we are sending the transaction from
   * @param signedRawTx hash of signed transaction
   * @returns transaction sending status
   */
  async sendRawTransactionInBlock(walletLabel: string, signedRawTx: string) {
    let res = await this.client.post(`wallet/${walletLabel}`, {
      jsonrpc: '1.0',
      id: 'rpc',
      method: 'sendrawtransaction',
      params: [signedRawTx],
    });
    ensure_data(res.data);
    let tx = await this.getTransaction(res.data.result, { verbose: true });
    while (!tx.blockhash) {
      await sleep(3000);
      tx = await this.getTransaction(res.data.result, { verbose: true });
    }
    return res.data.result;
  }

  /**
   * Get private key from wallet
   * @notice Dont share this with anyone
   * @param walletLabel wallet label that owns the address
   * @param address
   * @returns private key
   */
  async getPrivateKey(walletLabel: string, address: string) {
    let res = await this.client.post(`wallet/${walletLabel}`, {
      jsonrpc: '1.0',
      id: 'rpc',
      method: 'dumpprivkey',
      params: [address],
    });
    ensure_data(res.data);
    return res.data.result;
  }

  // if in regtest mode
  /**
   *
   * @dev Note that miner has to be registered in miner wallet
   * @param address
   * @param amount
   * @returns
   */
  async fundAddress(address: string, amount: number) {
    if (!this.inRegTest) {
      throw Error('You have to run client in regression test mode to use this ');
    }
    let res = await this.client.post(`wallet/miner`, {
      jsonrpc: '1.0',
      id: 'rpc',
      method: 'sendtoaddress',
      params: [address, amount],
    });
    ensure_data(res.data);
    return res.data.result;
  }

  /**
   * Attestor client specific methods
   * @param request
   * @returns
   */
  async getAdditionalTransactionDetails(request: AdditionalTxRequest): Promise<AdditionalTransactionDetails> {
    let blockResponse = (await this.getBlock(request.transaction.blockhash)) as IUtxoBlockRes;
    let inFunds: BN[] = [];
    let totalInFunds = toBN(0);
    // read input transactions

    let sourceAddresses: string[][] = [];

    for (let i = 0; i < request.transaction.vin.length; i++) {
      let vin = request.transaction.vin[i];
      if (vin.txid) {
        let rsp = (await this.getTransaction(vin.txid!, { verbose: true })) as IUtxoGetTransactionRes;
        let inVout = vin.vout!;
        sourceAddresses.push(rsp.vout[inVout].scriptPubKey.addresses);
        let outVal = toBN(Math.round(rsp.vout[vin.vout!].value * SATOSHI_BTC));
        inFunds.push(outVal);
        totalInFunds = totalInFunds.add(outVal);
      } else {
        sourceAddresses.push(['']);
        inFunds.push(toBN(0));
      }
    }

    // Calculate total out funds and returned funds
    let outFunds: BN[] = [];
    let totalOutFunds = toBN(0);
    let destinationAddresses: string[][] = [];
    for (let i = 0; i < request.transaction.vout.length; i++) {
      let vout = request.transaction.vout[i];
      let outValue = toBN(Math.round(vout.value * SATOSHI_BTC));
      outFunds.push(outValue);
      totalOutFunds = totalOutFunds.add(outValue);
      let targetAddresses = vout.scriptPubKey.addresses;
      destinationAddresses.push(targetAddresses);
    }

    let confirmationBlockHeight = blockResponse.height + request.confirmations;
    let dataAvailabilityProof: string | undefined = undefined;
    try {
      let confirmationBlock = (await this.getBlock(confirmationBlockHeight)) as IUtxoBlockRes;
      dataAvailabilityProof = prefix0x(confirmationBlock.hash);
    } catch (e) {}
    if (sourceAddresses.length != inFunds.length) {
      throw new Error('Source addresses length and inFunds length do not match!');
    }
    if (destinationAddresses.length != outFunds.length) {
      throw new Error('Destination addresses length and outFunds length do not match!');
    }

    let result = {
      blockNumber: toBN(blockResponse.height || 0),
      blockHash: blockResponse.hash,
      txId: prefix0x(request.transaction.txid),
      sourceAddresses,
      destinationAddresses,
      destinationTag: toBN(0),
      spent: inFunds,
      delivered: outFunds,
      fee: totalInFunds.sub(totalOutFunds),
      dataAvailabilityProof,
    } as AdditionalTransactionDetails;
    return result;
  }

  /**
   * Get all transaction hashes mined in the block as array
   * @param block Object returned by getBlock method
   * @returns array of transaction hashes
   */
  getTransactionHashesFromBlock(block: IUtxoBlockRes): string[] {
    return block.tx!.map((tx) => prefix0x(tx));
  }

  /**
   * Get block hash from block object
   * @param block Object returned by getBlock method
   * @returns array of transaction hashes
   */
  getBlockHash(block: IUtxoBlockRes): string {
    return prefix0x(block.hash);
  }
}
