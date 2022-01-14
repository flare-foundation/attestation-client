import { StateConnectorInstance } from "../typechain-truffle/StateConnector";
import { Attestation, AttestationStatus } from "./Attestation";
import { AttestationData } from "./AttestationData";
import { AttesterClientChain } from "./AttesterClientChain";
import { AttesterClientConfiguration } from "./AttesterClientConfiguration";
import { ChainManager } from "./ChainManager";
import { getTimeMilli, getTimeSec } from "./internetTime";
import { MCClient as MCClient } from "./MCC/MCClient";
import { ChainType, MCCNodeSettings } from "./MCC/MCClientSettings";
import { NormalizedTransactionData, TransactionAttestationRequest, VerificationStatus, verifyTransactionAttestation } from "./MCC/tx-normalize";
import { PriorityQueue } from "./priorityQueue";
import { arrayRemoveElement } from "./utils";

export class ChainNode {
  chainManager: ChainManager;

  chainName: string;
  chainType: ChainType;
  client: MCClient;
  stateConnector!: StateConnectorInstance;

  // node rate limiting control
  requestTime: number = 0;
  requestsPerSecond: number = 0;

  conf: AttesterClientChain;

  transactionsQueue = new Array<Attestation>();
  transactionsPriorityQueue = new PriorityQueue<Attestation>();

  transactionsProcessing = new Array<Attestation>();
  transactionsDone = new Array<Attestation>();

  delayQueueTimer: any = undefined; // todo: type should be Timer
  delayQueueStartTime = 0;

  constructor(chainManager: ChainManager, chainName: string, chainType: ChainType, metadata: string, chainCofiguration: AttesterClientChain) {
    this.chainName = chainName;
    this.chainType = chainType;
    this.chainManager = chainManager;
    this.conf = chainCofiguration;

    // create chain client
    this.client = new MCClient(new MCCNodeSettings(chainType, this.conf.url, this.conf.username, this.conf.password, metadata));
  }

  async isHealthy() {
    const valid = await this.client.isHealty();

    return true;
  }

  canAddRequests() {
    const time = getTimeSec();

    if (this.requestTime !== time) return true;

    return this.requestsPerSecond < this.conf.maxRequestsPerSecond;
  }

  addRequestCount() {
    const time = getTimeSec();

    if (this.requestTime === time) {
      this.requestsPerSecond++;
    } else {
      this.requestTime = time;
      this.requestsPerSecond = 0;
    }
  }

  canProcess() {
    return this.canAddRequests() && this.transactionsProcessing.length < this.conf.maxProcessingTransactions;
  }

  ////////////////////////////////////////////
  // queue
  // put transaction into queue
  ////////////////////////////////////////////
  queue(tx: Attestation) {
    //this.chainManager.logger.info(`    * chain ${this.chainName} queue ${tx.data.id}  (${this.transactionsQueue.length}++,${this.transactionsProcessing.length},${this.transactionsDone.length})`);
    tx.status = AttestationStatus.queued;
    this.transactionsQueue.push(tx);
  }

  ////////////////////////////////////////////
  // delayQueue
  // put transaction from processing queue into into delay queue - queue that can be processed in second part of commit epoch
  //
  // startTime is delay time in sec
  //
  // what this function does is to make sure there is a mechanism that will run startNext if nothing is in process
  //
  ////////////////////////////////////////////
  delayQueue(tx: Attestation, delayTimeSec: number) {
    switch (tx.status) {
      case AttestationStatus.queued:
        arrayRemoveElement(this.transactionsQueue, tx);
        break;
      case AttestationStatus.processing:
        arrayRemoveElement(this.transactionsProcessing, tx);
        break;
    }

    this.transactionsPriorityQueue.push(tx, getTimeMilli() + delayTimeSec * 1000);

    this.updateDelayQueueTimer();
  }

  updateDelayQueueTimer() {
    if (this.transactionsPriorityQueue.length() == 0) return;

    // set time to first time in queue
    const firstStartTime = this.transactionsPriorityQueue.peekKey()!;

    // if start time has passed then just call startNext (no timeout is needed)
    if (firstStartTime < getTimeMilli()) {
      this.startNext();
      return;
    }

    // check if time is before last time
    if (this.delayQueueTimer === undefined || firstStartTime < this.delayQueueStartTime) {
      // delete old timer if it exists
      if (this.delayQueueTimer !== undefined) {
        clearTimeout(this.delayQueueTimer);
        this.delayQueueTimer = undefined;
      }

      // setup new timer
      this.delayQueueStartTime = firstStartTime;
      this.delayQueueTimer = setTimeout(() => {
        this.chainManager.logger.debug(` # priority queue timeout`);

        this.startNext();
        this.delayQueueTimer = undefined;
      }, firstStartTime - getTimeMilli());
    }
  }

  ////////////////////////////////////////////
  // process
  //
  // process transaction
  ////////////////////////////////////////////
  async process(tx: Attestation) {
    //this.chainManager.logger.info(`    * chain ${this.chainName} process ${tx.data.id}  (${this.transactionsQueue.length},${this.transactionsProcessing.length}++,${this.transactionsDone.length})`);

    this.addRequestCount();
    this.transactionsProcessing.push(tx);

    tx.status = AttestationStatus.processing;
    tx.startTime = getTimeSec();

    // Actual Validate
    const attReq = tx.data.getAttestationRequest() as TransactionAttestationRequest;

    attReq.chainId = this.chainType;
    attReq.blockNumber = tx.data.blockNumber;

    verifyTransactionAttestation(this.client.chainClient, attReq)
      .then((txData: NormalizedTransactionData) => {
        // todo: check is status is not OK and FailReason??? is to not ready - it means to recheck in XXX sec but not before time T
        if (false) {
          this.delayQueue(tx, getTimeMilli() + 10 * 1000);
        } else {
          this.processed(tx, txData.verificationStatus === VerificationStatus.OK ? AttestationStatus.valid : AttestationStatus.invalid);
        }
      })
      .catch((txData: NormalizedTransactionData) => {
        if (tx.retry < this.conf.maxFailedRetry) {
          this.chainManager.logger.warning(`  * transaction verification error (retry ${tx.retry})`);

          tx.retry++;

          this.delayQueue(tx, this.conf.delayBeforeRetry);
        } else {
          this.chainManager.logger.error(`  * transaction verification error`);
          this.processed(tx, AttestationStatus.invalid);
        }
      });
  }

  ////////////////////////////////////////////
  // processed
  //
  // transaction was processed
  // move it to transactionsDone
  ////////////////////////////////////////////
  processed(tx: Attestation, status: AttestationStatus) {
    // set status
    tx.status = status;
    //this.chainManager.logger.info(`    * chain ${this.chainName} processed ${tx.data.id} status=${status}  (${this.transactionsQueue.length},${this.transactionsProcessing.length},${this.transactionsDone.length}++)`);

    // move into processed
    arrayRemoveElement(this.transactionsProcessing, tx);
    this.transactionsDone.push(tx);

    if (tx.onProcessed !== undefined) {
      tx.onProcessed(tx);
    }

    // start next transaction
    this.startNext();
  }

  ////////////////////////////////////////////
  // validate
  //
  // transaction into validation
  // (1) process
  // (2) queue - if processing is full
  ////////////////////////////////////////////
  validate(epoch: number, data: AttestationData): Attestation {
    // attestation info
    //this.chainManager.logger.info(`    * chain ${this.chainName} validate ${data.id}`);

    const transaction = new Attestation();
    transaction.epochId = epoch;
    transaction.chainNode = this;
    transaction.data = data;

    // check if transaction can be added into processing
    if (this.canProcess()) {
      this.process(transaction);
    } else {
      this.queue(transaction);
    }

    return transaction;
  }

  ////////////////////////////////////////////
  // startNext
  // start next queued transaction
  ////////////////////////////////////////////
  startNext() {
    if (!this.canProcess()) return;

    // check if there is queued priority transaction to be processed
    while (this.transactionsPriorityQueue.length() && this.canProcess()) {
      // check if queue start time is reached
      const startTime = this.transactionsPriorityQueue.peekKey()!;
      if (getTimeMilli() < startTime) break;

      // take top and process it then start new top timer
      const tx = this.transactionsPriorityQueue.pop();
      this.updateDelayQueueTimer();

      this.process(tx!);
    }

    // check if there is any queued transaction to be processed
    while (this.transactionsQueue.length && this.canProcess()) {
      const tx = this.transactionsQueue.shift();

      this.process(tx!);
    }
  }
}
