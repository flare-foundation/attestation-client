import { assert } from "console";
import { MCC } from ".";
// import { MCC } from "flare-mcc";
// import { RPCInterface } from "flare-mcc/dist/RPCtypes";
// import { sleepms } from "../Sleep";
import { ChainType, MCCNodeSettings as MCClientSettings } from "./MCClientSettings";
import { MCCTransaction } from "./MCCTransaction";
import { MCCTransactionResponse, TransactionStatus } from "./MCCTransactionResponse";
import { RPCInterface } from "./RPCtypes";
import { attReqToTransactionAttestationRequest } from "../Verification";

export enum ResultStatus {
  Success = 0,

  Info = 100,

  Warning = 200,

  Error = 300,
  NotSupported,
}

export class MCClient {
  settings: MCClientSettings;

  chainClient!: RPCInterface;

  constructor(settings: MCClientSettings) {
    this.settings = settings;

    switch (this.settings.chainType) {
      case ChainType.XRP:
        this.chainClient = new MCC.XRP(this.settings.url, this.settings.username, this.settings.password, this.settings.metaData);
        break;
      case ChainType.BTC:
        this.chainClient = new MCC.BTC(this.settings.url, this.settings.username, this.settings.password, this.settings.metaData);
        break;
      case ChainType.LTC:
        this.chainClient = new MCC.LTC(this.settings.url, this.settings.username, this.settings.password, this.settings.metaData);
        break;
      case ChainType.DOGE:
        this.chainClient = new MCC.DOGE(this.settings.url, this.settings.username, this.settings.password, this.settings.metaData);
        break;

      default:
        // error
        break;
    }
  }

  async canConnect(): Promise<boolean> {
    assert(this.chainClient);

    // return await this.chainClient.canConnect()
    return true;
  }

  async isHealty(): Promise<ResultStatus> {
    assert(this.chainClient);

    //return await this.chainClient.isHealty()

    return ResultStatus.Success;
  }

  async getBlockHeight(): Promise<number> {
    assert(this.chainClient);

    return await this.chainClient.getBlockHeight();
  }

  async getTransaction(transaction: MCCTransaction): Promise<MCCTransactionResponse> {
    assert(this.chainClient);

    return this.chainClient.getTransaction(transaction.tx);

    // sleepms(1000);

    // const result = new MCCTransactionResponse(TransactionStatus.Valid, "123", transaction, null);

    // return result;
  }
}
