import { StateConnectorInstance } from "../typechain-truffle/StateConnector";
import { Attestation, AttestationStatus } from "./Attestation";
import { AttestationData } from "./AttestationData";
import { Attester } from "./Attester";
import { ChainManager } from "./ChainManager";
import { getTimeSec } from "./internetTime";
import { MCClient as MCClient } from "./MCC/MCClient";
import { ChainType, MCCNodeSettings } from "./MCC/MCClientSettings";
import { NormalizedTransactionData, TransactionAttestationRequest, VerificationStatus, verifyTransactionAttestation } from "./MCC/tx-normalize";
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

  maxRequestsPerSecond: number = 2;
  maxProcessingTransactions: number = 10;

  transactionsQueue: Attestation[] = new Array<Attestation>();
  transactionsPriorityQueue: Attestation[] = new Array<Attestation>();
  transactionsDelayQueue: Attestation[] = new Array<Attestation>();

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
    const time = getTimeSec();

    if (this.requestTime !== time) return true;

    return this.requestsPerSecond < this.maxRequestsPerSecond;
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
    return this.canAddRequests() && this.transactionsProcessing.length < this.maxProcessingTransactions;
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
  // put transaction into delay queue - queue that can be processed in second part of commit epoch
  ////////////////////////////////////////////
  delayQueue(tx: Attestation) {
    arrayRemoveElement(this.transactionsProcessing, tx);
    this.transactionsDelayQueue.push(tx);

    // set timeout that removes tx from delayQueue into priorityQueue
    const now = getTimeSec();
    const epochCommitEndTime = Attester.epochSettings.getEpochIdCommitTimeEnd(tx.epochId);

    setTimeout(() => {
      this.chainManager.logger.info(`    * chain ${this.chainName} queue ${tx.data.id} delay queue started`);

      arrayRemoveElement(this.transactionsDelayQueue, tx);
      this.transactionsPriorityQueue.push(tx);

      // call start next just in case that nothing was processing in the moment
      this.startNext();
    }, (epochCommitEndTime - 45 - now) * 1000);
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
          this.delayQueue(tx);
        } else {
          this.processed(tx, txData.verificationStatus === VerificationStatus.OK ? AttestationStatus.valid : AttestationStatus.invalid);
        }
      })
      .catch((txData: NormalizedTransactionData) => {
        this.processed(tx, AttestationStatus.invalid);
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
    // check if there is queued priority transaction to be processed
    while (this.transactionsPriorityQueue.length && this.canProcess()) {
      const tx = this.transactionsPriorityQueue.shift();

      this.process(tx!);
    }

    // check if there is any queued transaction to be processed
    while (this.transactionsQueue.length && this.canProcess()) {
      const tx = this.transactionsQueue.shift();

      this.process(tx!);
    }
  }
}
