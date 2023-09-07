import {
  BlockBase,
  BlockHeaderBase,
  BlockTipBase,
  BtcBlock,
  BtcBlockHeader,
  BtcTransaction,
  ChainType,
  FullBlockBase,
  getTransactionOptions,
  INodeStatus,
  MccError,
  ReadRpcInterface,
  TransactionBase,
  unPrefix0x,
  XrpBlock,
  XrpTransaction,
} from "@flarenetwork/mcc";
import Web3 from "web3";
import * as btcBlockHeaderResponse from "./btc-block-header.json";
import * as btcBlockResponse from "./btc-block-response.json";
import * as btcTxResponse from "./btc-tx-response.json";
import * as xrpBlockResponse from "./xrp-block-response.json";
import * as xrpTxResponse from "./xrp-tx-response.json";

export class MockMccClient implements ReadRpcInterface<any, any, any, any, any> {
  getFullBlock(blockNumberOrHash: string | number): Promise<FullBlockBase<any>> {
    throw new Error("Method not implemented.");
  }
  web3 = new Web3();
  getNodeStatus(): Promise<INodeStatus> {
    throw new Error("Method not implemented.");
  }
  getBottomBlockHeight(): Promise<number> {
    throw new Error("Method not implemented.");
  }
  async getBlock(blockNumberOrHash: any): Promise<BlockBase> {
    const respData = { ...xrpBlockResponse.data };
    if (typeof blockNumberOrHash === "string") {
      const number = this.randomBlockNumber();
      respData.result = { ...respData.result, ledger_index: number, ledger_hash: blockNumberOrHash };
    } else {
      respData.result = { ...respData.result, ledger_index: blockNumberOrHash, ledger_hash: this.randomHash32(true) };
    }
    const txTemplate = new XrpBlock(respData as any);
    return txTemplate;
  }
  getBlockHeight(): Promise<number> {
    throw new Error("Method not implemented.");
  }
  getBlockTips?(height_gte: number): Promise<BlockTipBase[]> {
    throw new Error("Method not implemented.");
  }
  getTopLiteBlocks(branch_len: number, read_main?: boolean): Promise<BlockTipBase[]> {
    throw new Error("Method not implemented.");
  }
  getBlockHeader(blockNumberOrHash: any): Promise<BlockHeaderBase> {
    throw new Error("Method not implemented.");
  }
  async getTransaction(txId: string, metaData?: getTransactionOptions): Promise<TransactionBase> {
    if (txId === "") {
      throw MccError("XXX error"); // for testing purposes
    }
    const respData = { ...xrpTxResponse.data };
    respData.result = { ...respData.result, hash: unPrefix0x(txId).toUpperCase() };
    const txTemplate = new XrpTransaction(respData as any);
    return txTemplate;
  }

  listTransactions?(options?: any) {
    throw new Error("Method not implemented.");
  }
  chainType: ChainType;

  public randomHash32(unprefixAndUppercase = false) {
    const res = this.web3.utils.randomHex(32);
    if (!unprefixAndUppercase) {
      return res;
    }
    return unPrefix0x(res).toUpperCase();
  }

  public randomBlockNumber() {
    return Math.floor(Math.random() * 1000000) + 1;
  }
}

export class MockMccClientBTC implements ReadRpcInterface<any, any, any, any, any> {
  getFullBlock(blockNumberOrHash: string | number): Promise<FullBlockBase<any>> {
    throw new Error("Method not implemented.");
  }
  web3 = new Web3();
  getNodeStatus(): Promise<INodeStatus> {
    throw new Error("Method not implemented.");
  }
  getBottomBlockHeight(): Promise<number> {
    throw new Error("Method not implemented.");
  }
  async getBlock(blockNumberOrHash: any): Promise<BlockBase> {
    const respData = { ...btcBlockResponse.data };
    if (typeof blockNumberOrHash === "string") {
      respData.result.hash = blockNumberOrHash;
    } else {
      respData.result.height = blockNumberOrHash;
    }
    const blockTemplate = new BtcBlock(respData.result as any);
    return blockTemplate;
  }
  getBlockHeight(): Promise<number> {
    throw new Error("Method not implemented.");
  }
  getBlockTips?(height_gte: number): Promise<BlockTipBase[]> {
    throw new Error("Method not implemented.");
  }
  getTopLiteBlocks(branch_len: number, read_main?: boolean): Promise<BlockTipBase[]> {
    throw new Error("Method not implemented.");
  }
  async getBlockHeader(blockNumberOrHash: any): Promise<BlockHeaderBase> {
    const respData = { ...btcBlockHeaderResponse.data };
    if (typeof blockNumberOrHash === "string") {
      respData.result.hash = blockNumberOrHash;
    } else {
      respData.result.height = blockNumberOrHash;
    }
    const blockHeaderTemplate = new BtcBlockHeader(respData.result as any);
    return blockHeaderTemplate;
  }
  async getTransaction(txId: string, metaData?: getTransactionOptions): Promise<TransactionBase> {
    if (txId === "") {
      throw MccError("XXX error"); // for testing purposes
    }
    const respData = { ...btcTxResponse.data };
    respData.result.hash = unPrefix0x(txId).toUpperCase();
    const txTemplate = new BtcTransaction(respData.result as any);
    return txTemplate;
  }

  listTransactions?(options?: any) {
    throw new Error("Method not implemented.");
  }
  chainType: ChainType;

  public randomHash32(unprefixAndUppercase = false) {
    const res = this.web3.utils.randomHex(32);
    if (!unprefixAndUppercase) {
      return res;
    }
    return unPrefix0x(res).toUpperCase();
  }

  public randomBlockNumber() {
    return Math.floor(Math.random() * 1000000) + 1;
  }
}
