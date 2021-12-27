import { AdditionalTransactionDetails, AdditionalTxRequest, GetTransactionOptions, vin_utxo, vout_utxo } from "./RPCtypes";
import { toBN, toNumber } from "./tx-normalize";
import { ensure_data, sleep } from "./utils";

const axios = require('axios');
const SATOSHI_BTC = 100000000;

export interface ScriptPubKey {
  asm: string;
  hex: string;
  type: string;
  reqSigs: number;
  addresses: string[]
}

export interface UtxoVout {
  value: number;
  n: number;
  scriptPubKey: ScriptPubKey
}

export interface ScriptSig {
  asm: string;
  hex: string;
}

export interface UtxoVin {
  coinbase?: string;
  sequence: number;
  txid?: string;
  vout?: number;
  scriptSig?: ScriptSig;
  txinwitness?: string[];
}

export interface UtxoTxResponse {
  hex: string;
  txid: string;
  hash: string;
  size: number;
  vsize: number;
  version: number;
  locktime: number;
  vin: UtxoVin[];
  vout: UtxoVout[];
  blockhash: string;
  confirmations: number;
  time: number;
  blocktime: number;
}

export interface UtxoBlockHeaderResponse {
  hash: string;
  confirmations: number;
  height: number;
  version: number;
  versionHex: string;
  merkleroot: string;
  time: number;
  mediantime: number;
  nonce: number;
  bits: string;
  difficulty: number;
  chainwork: string;
  previousblockhash: string;
  nextblockhash: string;
}

export interface UtxoBlockResponse extends UtxoBlockHeaderResponse {
  size: number;
  strippedsize: number;
  weight: number;
  tx: string[];
  nTx: number;
}

export class UtxoCore {
  client: any
  inRegTest: boolean

  constructor(url: string, username: string, password: string, inRegTest: boolean = false) {
    this.client = axios.create({
      baseURL: url,
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' },
      auth: {
        username: username,
        password: password
      },
      validateStatus: function (status: number) {
        return status >= 200 && status < 300 || status == 500;
      },
    });
    this.inRegTest = inRegTest
  }

  /**
   * Get transaction details 
   * @param txId Transaction id
   * @param options provide verbose:boolean, set true if you want more info such as block hash...
   * @returns transaction details
   */
  async getTransaction(txId: string, options: GetTransactionOptions) {
    let verbose = options.verbose || false;
    let res = await this.client.post("",
      {
        "jsonrpc": "1.0",
        "id": "rpc",
        "method": "getrawtransaction",
        "params": [txId, verbose]
      })
    ensure_data(res.data);
    return res.data.result as UtxoTxResponse
  };

  /**
     * Get Block height (number of blocks) from connected chain
     * @returns block height (block count)
     */
  async getBlockHeight() {
    let res = await this.client.post("",
      {
        "jsonrpc": "1.0",
        "id": "rpc",
        "method": "getblockcount",
        "params": []
      })
    ensure_data(res.data);
    return res.data.result as number;
  };

  /**
   * Get header information about the block
   * @param blockHash 
   * @returns 
   */
  async getBlockHeader(blockHashOrHeight: string | number) {
    let blockHash: string | null = null;
    if(typeof blockHashOrHeight === "string") {
      blockHash = blockHashOrHeight as string;
    } else if(typeof blockHashOrHeight === "number") {
      blockHash = await this.getBlockHashFromHeight(blockHashOrHeight as number);
    }
    let res = await this.client.post("",
      {
        "jsonrpc": "1.0",
        "id": "rpc",
        "method": "getblockheader",
        "params": [blockHash]
      })
    ensure_data(res.data);
    return res.data.result as UtxoBlockHeaderResponse;
  };

  async getBlockHashFromHeight(blockNumber: number) {
    let res = await this.client.post("",
      {
        "jsonrpc": "1.0",
        "id": "rpc",
        "method": "getblockhash",
        "params": [blockNumber]
      })
    ensure_data(res.data);
    return res.data.result as string;
  };

  async getBlock(blockHashOrHeight: string | number) {
    let blockHash: string | null = null;
    if(typeof blockHashOrHeight === "string") {
      blockHash = blockHashOrHeight as string;
    } else if(typeof blockHashOrHeight === "number") {
      blockHash = await this.getBlockHashFromHeight(blockHashOrHeight as number);
    }
    let res = await this.client.post("",
      {
        "jsonrpc": "1.0",
        "id": "rpc",
        "method": "getblock",
        "params": [blockHash]
      })
    ensure_data(res.data);
    return res.data.result as UtxoBlockResponse;
  };

  async createWallet(walletLabel: string) {
    let res = await this.client.post("",
      {
        "jsonrpc": "1.0",
        "id": "rpc",
        "method": "createwallet",
        "params": [walletLabel]
      })
    ensure_data(res.data);
    // TODO try to import wallet if it already exists but is not imported
    return res.data.result
  };

  /**
   * 
   * @param walletLabel label of wallet, if you dont have one create one with createWallet
   * @param label label of address within wallet (default to "")
   * @param address_type type of address (default to "legacy") options = ["legacy", "p2sh-segwit", "bech32"]
   * @returns 
   */
  async createAddress(walletLabel: string, addressLabel: string = "", address_type: string = "legacy") {
    let res = await this.client.post(`wallet/${walletLabel}`,
      {
        "jsonrpc": "1.0",
        "id": "rpc",
        "method": "getnewaddress",
        "params": [addressLabel, address_type]
      })
    ensure_data(res.data);
    return res.data.result
  };

  async listAllWallets() {
    let res = await this.client.post(``,
      {
        "jsonrpc": "1.0",
        "id": "rpc",
        "method": "listwallets",
        "params": []
      })
    ensure_data(res.data);
    return res.data.result
  }

  async listAllAddressesByLabel(walletLabel: string, addressLabel: string = "") {
    let res = await this.client.post(`wallet/${walletLabel}`,
      {
        "jsonrpc": "1.0",
        "id": "rpc",
        "method": "getaddressesbylabel",
        "params": [addressLabel]
      })
    ensure_data(res.data);
    return res.data.result
  }

  async listUnspentTransactions(walletLabel: string, min: number = 0, max: number = 1e6) {
    let res = await this.client.post(`wallet/${walletLabel}`,
      {
        "jsonrpc": "1.0",
        "id": "rpc",
        "method": "listunspent",
        "params": [min, max]
      })
    ensure_data(res.data);
    return res.data.result
  }

  async createRawTransaction(walletLabel: string, vin: vin_utxo[], out: vout_utxo[]) {
    let voutArr = "["
    let first = true
    for (let i of out) {
      if (first) {
        first = false
      } else {
        voutArr += ","
      }
      let row = `{"${i.address}" : ${i.amount}}`
      voutArr += row
    }
    voutArr += "]"
    let VoutArr = JSON.parse(voutArr)
    let res = await this.client.post(`wallet/${walletLabel}`,
      {
        "jsonrpc": "1.0",
        "id": "rpc",
        "method": "createrawtransaction",
        "params": [vin, VoutArr]
      })
    ensure_data(res.data);
    return res.data.result
  };

  async signRawTransaction(walletLabel: string, rawTx: string, keysList: string[]) {
    let res = await this.client.post(`wallet/${walletLabel}`,
      {
        "jsonrpc": "1.0",
        "id": "rpc",
        "method": "signrawtransactionwithkey",
        "params": [rawTx, keysList]
      })
    ensure_data(res.data);
    return res.data.result
  }

  /**
   * Send raw transaction
   * @param walletLabel the label of the wallet we are sending the transaction from
   * @param signedRawTx hash of signed transaction
   * @returns transaction sending status
   */
  async sendRawTransaction(walletLabel: string, signedRawTx: string) {
    let res = await this.client.post(`wallet/${walletLabel}`,
      {
        "jsonrpc": "1.0",
        "id": "rpc",
        "method": "sendrawtransaction",
        "params": [signedRawTx]
      })
    ensure_data(res.data);
    return res.data.result
  }

  /**
   * Send raw transaction and wait for it to be in next block
   * @param walletLabel the label of the wallet we are sending the transaction from
   * @param signedRawTx hash of signed transaction
   * @returns transaction sending status
   */
  async sendRawTransactionInBlock(walletLabel: string, signedRawTx: string) {
    let res = await this.client.post(`wallet/${walletLabel}`,
      {
        "jsonrpc": "1.0",
        "id": "rpc",
        "method": "sendrawtransaction",
        "params": [signedRawTx]
      })
    ensure_data(res.data);
    let tx = await this.getTransaction(res.data.result, { verbose: true })
    while (!tx.blockhash) {
      await sleep(5000)
      tx = await this.getTransaction(res.data.result, { verbose: true })
    }
    return res.data.result
  };

  /**
   * Get private key from wallet
   * @notice Dont share this with anyone
   * @param walletLabel wallet label that owns the address
   * @param address 
   * @returns private key
   */
  async getPrivateKey(walletLabel: string, address: string) {
    let res = await this.client.post(`wallet/${walletLabel}`,
      {
        "jsonrpc": "1.0",
        "id": "rpc",
        "method": "dumpprivkey",
        "params": [address]
      })
    ensure_data(res.data);
    return res.data.result
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
      throw Error("You have to run client in regression test mode to use this ")
    }
    let res = await this.client.post(`wallet/miner`,
      {
        "jsonrpc": "1.0",
        "id": "rpc",
        "method": "sendtoaddress",
        "params": [address, amount]
      })
    ensure_data(res.data);
    return res.data.result
  }

  async getAdditionalTransactionDetails(request: AdditionalTxRequest): Promise<AdditionalTransactionDetails> {
    let blockResponse = await this.getBlock(request.transaction.blockhash) as UtxoBlockResponse;
    let vinTransactions: UtxoTxResponse[] = []
    let inFunds = toBN(0);
    for (let vin of request.transaction.vin) {
      let rsp = await this.getTransaction(vin.txid!, { verbose: true }) as UtxoTxResponse;
      vinTransactions.push(rsp);
      inFunds = inFunds.add(toBN(Math.round(rsp.vout[vin.vout!].value * SATOSHI_BTC)))
    }

    let inVout = request.transaction.vin[0].vout!;
    let addresses = vinTransactions[0].vout[inVout].scriptPubKey.addresses;
    if (addresses.length != 1) throw Error("Multiple or missing sender address");
    let sourceAddress = addresses[0];

    // Calculate total out funds and returned funds
    let outFunds = toBN(0);
    let returnedFunds = toBN(0);
    for (let vout of request.transaction.vout) {
      outFunds = outFunds.add(toBN(Math.round(vout.value * SATOSHI_BTC)));
      let targetAddresses = vout.scriptPubKey.addresses;
      if (targetAddresses.length != 1) throw Error("Multiple or missing target address");
      let targetAddress = targetAddresses[0];
      if(targetAddress === sourceAddress) {
        let amount = toBN(Math.round(vout.value * SATOSHI_BTC));
        returnedFunds = returnedFunds.add(amount);
      }
    }

    let confirmationBlockHeight = blockResponse.height + request.confirmations;
    let confirmationBlock = await this.getBlock(confirmationBlockHeight) as UtxoBlockResponse;
    let dataAvailabilityProof = "0x" + confirmationBlock.hash;
    
    return {
      blockNumber: toBN(blockResponse.height || 0),
      txId: "0x" + request.transaction.txid,
      utxo: toBN(request.utxo!)!,
      sourceAddress,
      destinationAddress: request.transaction.vout[toNumber(request.utxo!)!].scriptPubKey.addresses[0],
      destinationTag: toBN(0),
      spent: inFunds.sub(returnedFunds),
      delivered: toBN(Math.round(request.transaction.vout[toNumber(request.utxo!)!].value * 100000000)),
      fee: inFunds.sub(outFunds),
      dataAvailabilityProof
    } as AdditionalTransactionDetails
  }

  getTransactionHashesFromBlock(block: UtxoBlockResponse): string[] {
    return block.tx!.map(tx => "0x" + tx);
  }

  getBlockHash(block: UtxoBlockResponse): string {
    return "0x" + block.hash;
  }
};
