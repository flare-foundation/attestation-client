import { ChainManager } from "./ChainManager";
import { Attestation, AttestationStatus } from "./Attestation";
import { AttestationData } from "./AttestationData";
import { getTime } from "./internetTime";
import { MCClient as MCClient } from "./MCC/MCClient";
import { ChainType, MCCNodeSettings } from "./MCC/MCClientSettings";
import { MCCTransaction } from "./MCC/MCCTransaction";
import { MCCTransactionResponse } from "./MCC/MCCTransactionResponse";
import { arrayRemoveElement } from "./utils";
import { BigNumber } from "ethers";

const toBN = web3.utils.toBN;

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

  transactionsQueue: Attestation[] = new Array<Attestation>();
  transactionsProcessing: Attestation[] = new Array<Attestation>();
  transactionsDone: Attestation[] = new Array<Attestation>();

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

  queue(tx: Attestation) {
    this.chainManager.logger.info(
      `    * chain ${this.chainName} queue ${tx.data.id}  (${this.transactionsQueue.length}++,${this.transactionsProcessing.length},${this.transactionsDone.length})`
    );
    tx.status = AttestationStatus.queued;
    this.transactionsQueue.push(tx);
  }

  process(tx: Attestation) {
    this.chainManager.logger.info(
      `    * chain ${this.chainName} process ${tx.data.id}  (${this.transactionsQueue.length},${this.transactionsProcessing.length}++,${this.transactionsDone.length})`
    );

    this.addRequestCount();
    this.transactionsProcessing.push(tx);

    tx.status = AttestationStatus.processing;
    tx.startTime = getTime();

    // start underlying chain client getTransaction
    this.client
      .getTransaction(new MCCTransaction(tx.data.id, tx.metaData))
      .then((response: MCCTransactionResponse) => {
        this.processed(tx, AttestationStatus.valid);
      })
      .catch((response: MCCTransactionResponse) => {
        this.processed(tx, AttestationStatus.invalid);
      });
  }

  processed(tx: Attestation, status: AttestationStatus) {
    this.chainManager.logger.info(
      `    * chain ${this.chainName} processed ${tx.data.id} status=${status}  (${this.transactionsQueue.length},${this.transactionsProcessing.length},${this.transactionsDone.length}++)`
    );

    arrayRemoveElement(this.transactionsProcessing, tx);
    this.transactionsDone.push(tx);

    if (tx.onProcessed !== undefined) {
      tx.onProcessed(tx);
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

  validate(epoch: number, data: AttestationData): Attestation {
    // parse data
    const bit16 = toBN(1).shln(16).sub(toBN(1));
    const bit32 = toBN(1).shln(32).sub(toBN(1));
    const bit64 = toBN(1).shln(64).sub(toBN(1));

    // 32 chainId
    // 64 blockHeight
    // 16 utxo

    const blockHeight: BN = data.data.shrn(32).and(bit64);
    const utxo: BN = data.data.shrn(32 + 64).and(bit16);

    // attestation info
    this.chainManager.logger.info(`    * chain ${this.chainName} validate ${data.id}`);

    const transaction = new Attestation();
    transaction.epochId = epoch;
    transaction.chainNode = this;
    transaction.data = data;

    // save transaction meta data
    transaction.metaData = {
      blockHeight: blockHeight,
      utxo: utxo,
    };

    // check if transaction can be added into processing
    if (this.canProcess()) {
      this.process(transaction);
    } else {
      this.queue(transaction);
    }

    return transaction;
  }
}
