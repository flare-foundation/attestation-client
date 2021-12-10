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

    constructor(
        chainManager: ChainManager,
        chainName: string,
        chainType: ChainType,
        url: string,
        username: string,
        password: string,
        metadata: string,
        maxRequestsPerSecond: number = 10,
        maxProcessingTransactions: number = 10
    ) {
        this.chainName = chainName;
        this.chainType = chainType;
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
        } else {
            this.requestTime = time;
            this.requestsPerSecond = 0;
        }
    }

    queue(tx: ChainTransaction) {
        this.chainManager.logger.info(`    * chain ${this.chainName} queue ${tx.transactionHash}  (${this.transactionsQueue.length}++,${this.transactionsProcessing.length},${this.transactionsDone.length})`);
        tx.status = ChainTransactionStatus.queued;
        this.transactionsQueue.push(tx);
    }

    process(tx: ChainTransaction) {
        this.chainManager.logger.info(`    * chain ${this.chainName} process ${tx.transactionHash}  (${this.transactionsQueue.length},${this.transactionsProcessing.length}++,${this.transactionsDone.length})`);

        this.addRequestCount();
        this.transactionsProcessing.push(tx);

        tx.status = ChainTransactionStatus.processing;
        tx.startTime = getTime();

        // start underlying chain client getTransaction
        this.client
            .getTransaction(new MCCTransaction(tx.transactionHash, tx.metaData))
            .then((response: MCCTransactionResponse) => {
                this.processed(tx, ChainTransactionStatus.valid);
            })
            .catch((response: MCCTransactionResponse) => {
                this.processed(tx, ChainTransactionStatus.invalid);
            });
    }

    processed(tx: ChainTransaction, status: ChainTransactionStatus) {
        this.chainManager.logger.info(`    * chain ${this.chainName} processed ${tx.transactionHash} status=${status}  (${this.transactionsQueue.length},${this.transactionsProcessing.length},${this.transactionsDone.length}++)`);

        arrayRemoveElement(this.transactionsProcessing, tx);
        this.transactionsDone.push(tx);

        if( tx.onProcessed!==undefined ) {
            tx.onProcessed( tx );
        }

        // check if there is any new transaction to be processed
        while (this.transactionsQueue.length > 0 && this.canProcess()) {
            const tx = this.transactionsQueue[0];
            this.transactionsQueue.splice(0, 1);

            this.process(tx);
        }

        // check if all done and collect epoch is done
    }

    canProcess() {
        return this.canAddRequests() && this.transactionsProcessing.length < this.maxProcessingTransactions;
    }

    validate(epoch: number, id: number, transactionHash: string, metadata: any): ChainTransaction {
        this.chainManager.logger.info(`    * chain ${this.chainName} validate ${transactionHash}`);
        const tx = new ChainTransaction();
        tx.epochId = epoch;
        tx.id = id;
        tx.chainNode = this;
        tx.transactionHash = transactionHash;
        tx.metaData = metadata;

        // check if transaction can be added into processing
        if (this.canProcess()) {
            this.process(tx);
        } else {
            this.queue(tx);
        }

        return tx;
    }

}
