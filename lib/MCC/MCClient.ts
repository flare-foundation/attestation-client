import { assert } from "console";
import { MCC } from "flare-mcc";
import { RPCInterface } from "flare-mcc/dist/RPCtypes";
import { ChainType, MCCNodeSettings as MCClientSettings } from "./MCClientSettings";
import { MCCTransaction } from "./MCCTransaction";
import { MCCTransactionResponse, TransactionStatus } from "./MCCTransactionResponse";

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

        const chainResult = await this.chainClient.getTransaction(transaction.tx);

        const result = new MCCTransactionResponse(TransactionStatus.Valid, "123", transaction, null);

        return result;
    }
}