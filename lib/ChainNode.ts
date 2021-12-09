import { ChainManager } from "./ChainManager";
import { ChainTransaction, ChainTransactionStatus } from "./ChainTransaction";
import { getTime } from "./internetTime";
import { MCClient as MCClient } from "./MCC/MCClient";
import { ChainType, MCCNodeSettings } from "./MCC/MCClientSettings";
import { MCCTransaction } from "./MCC/MCCTransaction";
import { MCCTransactionResponse } from "./MCC/MCCTransactionResponse";

export class ChainNode {

    chainManager: ChainManager;

    client: MCClient;

    // node rate limiting control
    requestTime: number = 0;
    requestsPerSecond: number = 0;

    maxRequestsPerSecond: number = 2;
    maxProcessingTransactions: number = 10;

    transactionsQueue: ChainTransaction[] = new Array<ChainTransaction>();
    transactionsProcessing: ChainTransaction[] = new Array<ChainTransaction>();
    transactionsDone: ChainTransaction[] = new Array<ChainTransaction>();

    constructor(chainManager: ChainManager, chainType: ChainType, url: string, username: string, password: string, metadata: string, maxRequestsPerSecond: number = 10, maxProcessingTransactions: number = 10) {
        this.chainManager = chainManager;
        this.maxRequestsPerSecond = maxRequestsPerSecond;
        this.maxProcessingTransactions = maxProcessingTransactions;

        // create chain client
        this.client = new MCClient( new MCCNodeSettings( chainType , url , username , password , metadata ) );
    }

    async isHealthy() {
        const valid = await this.client.isHealty();

        console.log( valid );

        return true;
    }

    canAddRequests() {
        const time = getTime();

        if (this.requestTime !== time) return true;

        return this.requestsPerSecond < this.maxRequestsPerSecond;
    }

    addRequestCount() {
        const time = getTime();

        if (this.requestTime === time) {
            this.requestsPerSecond++;
        }
        else {
            this.requestTime = time;
            this.requestsPerSecond = 0;
        }
    }

    async processTransaction(tx: ChainTransaction) {
        this.addRequestCount();
        this.transactionsProcessing.push(tx);

        tx.status = ChainTransactionStatus.processing;
        tx.startTime = getTime();

        // start underlying chain client getTransaction
        this.client.getTransaction( new MCCTransaction(tx.transactionHash,tx.metaData) ).then( (response: MCCTransactionResponse)=>{
            tx.status = ChainTransactionStatus.valid;
        } );
    }

    canAddTransaction() {
        return this.canAddRequests() && this.transactionsProcessing.length < this.maxProcessingTransactions;
    }

    validateTransaction(epoch: number, id: number, transactionHash: string, metadata: any) {
        const tx = new ChainTransaction();
        tx.epoch = epoch;
        tx.id = id;
        tx.chainNode = this;
        tx.transactionHash = transactionHash;
        tx.metaData = metadata;

        if (this.canAddTransaction()) {
            this.processTransaction(tx);
        }
        else {
            this.transactionsQueue.push(tx);
        }

        return tx;
    }

    async update() {
        // push queued transactions into processing
        while (this.transactionsQueue.length > 0 && this.canAddTransaction()) {
            const tx = this.transactionsQueue[0];
            this.transactionsQueue.splice(0, 1);

            this.processTransaction(tx);
        }

        // check transactions in processing
        for (let a = 0; a < this.transactionsProcessing.length; a++) {
            const tx = this.transactionsProcessing[a];

            // check if this transaction is not processing anymore
            if (tx.status !== ChainTransactionStatus.processing ) {
                this.transactionsProcessing.splice(a--, 1);
                this.transactionsDone.push(tx);
            }
        }
    }

}
