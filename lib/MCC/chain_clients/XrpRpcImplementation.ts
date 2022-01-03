import { LedgerRequest, LedgerResponse, Payment, TransactionMetadata, TxResponse } from 'xrpl';
import { prefix0x, toBN } from '../../utils';
import {
  AdditionalTransactionDetails,
  AdditionalTxRequest,
  GetTransactionOptions, RPCInterface
} from '../RPCtypes';
import { xrp_ensure_data } from '../utils';

const axios = require('axios');

export class XRPImplementation implements RPCInterface {
  client: any;
  inRegTest: any;

  constructor(
    url: string,
    _username: string,
    _password: string,
    _inRegTest: boolean = false
  ) {
    
    this.client = axios.create({
      baseURL: url,
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' },
      validateStatus: function (status: number) {
        return (status >= 200 && status < 300) || status == 500;
      },
    });
    this.inRegTest = _inRegTest;
  }

  async getTransaction(
    txId: string,
    options?: GetTransactionOptions
  ): Promise<TxResponse> {
    const binary = options?.binary || false;
    const min_block = options?.min_block || null;
    const max_block = options?.max_block || null;
    interface XrpTxParams {
      transaction: string;
      binary: boolean;
      min_ledger?: number;
      max_ledger?: number;
    }
    let params: XrpTxParams = {
      transaction: txId,
      binary: binary,
    };
    if (min_block !== null && max_block !== null) {
      params.min_ledger = min_block;
      params.max_ledger = max_block;
    }
    let res = await this.client.post('', {
      method: 'tx',
      params: [params],
    });
    xrp_ensure_data(res.data);
    return res.data;
  }

  async isHealthy() {
    let res = await this.client.post('', {
      method: "server_info",
      params: [{}]
    });
    console.log(res.data);
    const validStates = ['full']
    xrp_ensure_data(res.data);
    let state = res.data.result.info.server_state
    return validStates.includes(state);
  }

  async getBlockHeight() {
    let res = await this.client.post('', {
      method: 'ledger_current',
      params: [{}],
    });
    xrp_ensure_data(res.data);
    return res.data.result.ledger_current_index;
  }

  async createAddress(_createAddressData: any) {
    return;
  }

  async createRawTransaction(_walletLabel: string) {
    return;
  }

  async signRawTransaction(
    _walletLabel: string,
    _rawTx: string,
    _keysList: string[]
  ) {
    return;
  }

  async sendRawTransaction(_walletLabel: string, _signedRawTx: string) {
    return;
  }

  async sendRawTransactionInBlock(_walletLabel: string, _signedRawTx: string) {
    return;
  }

  async fundAddress(_address: string, _amount: number) {
    return;
  }
 
  async getBlock(blockNumberOrHash: number | string) {
    let res = await this.client.post('', {
      method: 'ledger',
      params: [{
        ledger_index: blockNumberOrHash,
        transactions: true,
        expand: true,
        binary: false
      } as LedgerRequest],
    });
    xrp_ensure_data(res.data);
    return res.data as LedgerResponse
  }

  async getAdditionalTransactionDetails(request: AdditionalTxRequest) {
    let blockNumber = request.transaction.result.ledger_index || 0;
    let blockResponse = await this.getBlock(request.transaction.blockhash) as LedgerResponse;
    let metaData: TransactionMetadata = request.transaction.result.meta || (request.transaction.result as any).metaData;    
    let delivered = toBN(metaData.delivered_amount as string); // XRP in drops
    
    let confirmationBlockIndex = blockNumber + request.confirmations;
    let confirmationBlock = await this.getBlock(confirmationBlockIndex);
    let fee = toBN(request.transaction.result.Fee!);
    return {
      blockNumber: toBN(blockNumber),
      blockHash: blockResponse.result.ledger_hash,
      txId: prefix0x(request.transaction.result.hash),
      sourceAddresses: request.transaction.result.Account,
      destinationAddresses: (request.transaction.result as Payment).Destination,
      destinationTag: toBN((request.transaction.result as Payment).DestinationTag || 0),
      spent: toBN((request.transaction.result as Payment).Amount as any).add(fee),   // should be string or number
      delivered: delivered,
      fee,
      dataAvailabilityProof: prefix0x(confirmationBlock.result.ledger_hash)
    } as AdditionalTransactionDetails;
  }

  getTransactionHashesFromBlock(block: LedgerResponse): string[] {
    return block.result.ledger.transactions!.map(tx => prefix0x((tx as any).hash));
  }

  getBlockHash(block: LedgerResponse): string {
    return prefix0x(block.result.ledger_hash);
  }

}
