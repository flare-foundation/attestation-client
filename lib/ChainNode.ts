import { ChainManager } from "./ChainManager";
import { ChainTransaction, ChainTransactionStatus } from "./ChainTransaction";
import { getTime } from "./internetTime";
import { MCClient as MCClient } from "./MCC/MCClient";
import { ChainType, MCCNodeSettings } from "./MCC/MCClientSettings";
import { MCCTransaction } from "./MCC/MCCTransaction";
import { MCCTransactionResponse } from "./MCC/MCCTransactionResponse";
import { arrayRemoveElement } from "./utils";

export class ChainNode {

    chainManager: ChainManager;

    chainName: string;
    chainType: ChainType;
    client: MCClient;

    // node rate limiting control
    requestTime: number = 0;
    requestsPerSecond: number = 0;

    maxRequestsPerSecond: number = 2;
    maxProcessingTransactions: number = 10;

    transactionsQueue: ChainTransaction[] = new Array<ChainTransaction>();
    transactionsProcessing: ChainTransaction[] = new Array<ChainTransaction>();
    transactionsDone: ChainTransaction[] = new Array<ChainTransaction>();

    constructor(chainManager: ChainManager, chainName: string, chainType: ChainType, url: string, username: string, password: string, metadata: string, maxRequestsPerSecond: number = 10, maxProcessingTransactions: number = 10) {
        this.chainName=chainName;
        this.chainType=chainType;
        this.chainManager = chainManager;
        this.maxRequestsPerSecond = maxRequestsPerSecond;
        this.maxProcessingTransactions = maxProcessingTransactions;

        // create chain client
        this.client = new MCClient(new MCCNodeSettings(chainType, url, username, password, metadata));
    }

    async isHealthy() {
        const valid = await this.client.isHealty();

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

    queueTransaction(tx: ChainTransaction) {
        tx.status = ChainTransactionStatus.queued;
        this.transactionsQueue.push(tx);
    }

    processTransaction(tx: ChainTransaction) {

        this.chainManager.logger.info( `    * chain ${this.chainName} process ${tx.transactionHash}` );

        this.addRequestCount();
        this.transactionsProcessing.push(tx);

        tx.status = ChainTransactionStatus.processing;
        tx.startTime = getTime();

        // start underlying chain client getTransaction
        this.client.getTransaction(new MCCTransaction(tx.transactionHash, tx.metaData)).
            then((response: MCCTransactionResponse) => {
                this.transactionProcessed(tx, ChainTransactionStatus.valid);
            }).
            catch((response: MCCTransactionResponse) => {
                this.transactionProcessed(tx, ChainTransactionStatus.invalid);
            });
    }

    transactionProcessed(tx: ChainTransaction, status: ChainTransactionStatus) {
        this.chainManager.logger.info( `    * chain ${this.chainName} processed ${tx.transactionHash} status=${status}` );

        arrayRemoveElement( this.transactionsProcessing , tx );
        this.transactionsDone.push(tx);

        // check if there is any new transaction to be processed
        while( this.transactionsQueue.length > 0 && this.canProcessTransaction()) {
            const tx = this.transactionsQueue[0];
            this.transactionsQueue.splice(0, 1);

            this.processTransaction(tx);
        }
    }

    canProcessTransaction() {
        return this.canAddRequests() && this.transactionsProcessing.length < this.maxProcessingTransactions;
    }

    validateTransaction(epoch: number, id: number, transactionHash: string, metadata: any): ChainTransaction {
        this.chainManager.logger.info( `    * chain ${this.chainName} validate ${transactionHash}` );
        const tx = new ChainTransaction();
        tx.epoch = epoch;
        tx.id = id;
        tx.chainNode = this;
        tx.transactionHash = transactionHash;
        tx.metaData = metadata;

        // check if transaction can be added into processing
        if (this.canProcessTransaction()) {
            this.processTransaction(tx);
        }
        else {
            this.queueTransaction(tx);
        }

        return tx;
    }

    async update() {
        // // push queued transactions into processing
        // while (this.transactionsQueue.length > 0 && this.canProcessTransaction()) {
        //     const tx = this.transactionsQueue[0];
        //     this.transactionsQueue.splice(0, 1);

        //     this.processTransaction(tx);
        // }

        // // check transactions in processing
        // for (let a = 0; a < this.transactionsProcessing.length; a++) {
        //     const tx = this.transactionsProcessing[a];

        //     // check if this transaction is not processing anymore
        //     if (tx.status !== ChainTransactionStatus.processing) {
        //         this.transactionsProcessing.splice(a--, 1);
        //         this.transactionsDone.push(tx);
        //     }
        // }
    }

}
