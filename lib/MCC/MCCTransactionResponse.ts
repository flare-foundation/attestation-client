import { threadId } from "worker_threads";
import { MCCTransaction } from "./MCCTransaction";

export enum TransactionStatus {
    Valid = 0,
    Invalid = 1,
    Error = 100,
}

export class MCCTransactionResponse {

    status: TransactionStatus;

    txHash: string;
    tx: MCCTransaction;

    metaData: any;

    constructor(status: TransactionStatus, txHash: string, tx: MCCTransaction, metaData: any = null) {
        this.status = status;
        this.txHash = txHash;
        this.tx = tx;
        this.metaData = metaData;
    }
}