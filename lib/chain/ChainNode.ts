import assert from "assert";
import { ChainType, MCC, RPCInterface } from "flare-mcc";
import { StateConnectorInstance } from "../../typechain-truffle/StateConnector";
import { Attestation, AttestationStatus } from "../attester/Attestation";
import { AttestationRoundManager } from "../attester/AttestationRoundManager";
import { AttesterClientChain } from "../attester/AttesterClientChain";
import { getTimeMilli, getTimeSec } from "../utils/internetTime";
import { PriorityQueue } from "../utils/priorityQueue";
import { arrayRemoveElement } from "../utils/utils";
import { NormalizedTransactionData, TransactionAttestationRequest, VerificationStatus } from "../verification/attestation-types";
import { verifyTransactionAttestation } from "../verification/verification";
import { ChainManager } from "./ChainManager";

export class ChainNode {
  chainManager: ChainManager;

  chainName: string;
  chainType: ChainType;
  client: RPCInterface;
  stateConnector!: StateConnectorInstance;

  // node rate limiting control
  requestTime: number = 0;
  requestsPerSecond: number = 0;

  conf: AttesterClientChain;

  transactionsQueue = new Array<Attestation>();
  transactionsPriorityQueue = new PriorityQueue<Attestation>();

  transactionsProcessing = new Array<Attestation>();

  delayQueueTimer: NodeJS.Timeout | undefined = undefined;
  delayQueueStartTime = 0;

  constructor(chainManager: ChainManager, chainName: string, chainType: ChainType, metadata: string, chainCofiguration: AttesterClientChain) {
    this.chainName = chainName;
    this.chainType = chainType;
    this.chainManager = chainManager;
    this.conf = chainCofiguration;

    const url = this.conf.url;
    const username = this.conf.username;
    const password = this.conf.password;

    // create chain client
    switch (this.chainType) {
      case ChainType.BTC:
      case ChainType.LTC:
      case ChainType.DOGE:
        this.client = MCC.Client(this.chainType, {
          url,
          username,
          password,
          rateLimitOptions: {
            maxRPS: chainCofiguration.maxRequestsPerSecond,
            timeoutMs: chainCofiguration.clientTimeout,
            retries: chainCofiguration.clientRetries,
            onSend: this.onSend.bind(this),
          },
        }) as RPCInterface;
        break;
      case ChainType.XRP:
        this.client = MCC.Client(this.chainType, {
          url,
          username,
          password,
          rateLimitOptions: {
            maxRPS: chainCofiguration.maxRequestsPerSecond,
            timeoutMs: chainCofiguration.clientTimeout,
            retries: chainCofiguration.clientRetries,
            onSend: this.onSend.bind(this),
          },
        }) as RPCInterface;
        break;
      case ChainType.ALGO:
        throw new Error("Not yet Implemented");
      default:
        throw new Error("");
    }
  }

  onSend(inProcessing?: number, inQueue?: number) {
    this.addRequestCount();
  }

  async isHealthy() {
    const valid = await this.client.isHealthy();

    return true;
  }

  getLoad(): number {
    return this.transactionsQueue.length + this.transactionsProcessing.length + this.transactionsPriorityQueue.length();
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

    const now = getTimeMilli();

    // check if the transaction is too late
    if (now > tx.round.commitEndTime) {
      //this.chainManager.logger.error(`  * ${tx.epochId} transaction too late to process`);

      tx.status = AttestationStatus.tooLate;

      this.processed(tx, AttestationStatus.tooLate);

      return;
    }

    //this.addRequestCount();
    this.transactionsProcessing.push(tx);

    tx.status = AttestationStatus.processing;
    tx.processStartTime = now;

    // Actual Validate
    const attReq = tx.data.getAttestationRequest() as TransactionAttestationRequest;

    attReq.chainId = this.chainType;
    attReq.blockNumber = tx.data.blockNumber;

    // debug test fail
    let testFail = 0;
    if (process.env.TEST_FAIL) {
      testFail = tx.reverification ? 0 : parseFloat(process.env.TEST_FAIL);
    }

    verifyTransactionAttestation(this.client, attReq, { testFailProbability: testFail })
      .then((txData: NormalizedTransactionData) => {
        tx.processEndTime = getTimeMilli();
        if (txData.verificationStatus === VerificationStatus.RECHECK_LATER) {
          this.chainManager.logger.warning(` * reverification`);

          tx.reverification = true;

          // delay until end of commit epoch
          const timeDelay = (AttestationRoundManager.epochSettings.getEpochIdCommitTimeEnd(tx.epochId) - getTimeMilli()) / 1000;

          this.delayQueue(tx, timeDelay - this.conf.reverificationTimeOffset);
        } else {
          this.processed(tx, txData.verificationStatus === VerificationStatus.OK ? AttestationStatus.valid : AttestationStatus.invalid, txData);
        }
      })
      .catch((txData: NormalizedTransactionData) => {
        tx.processEndTime = getTimeMilli();
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
  processed(tx: Attestation, status: AttestationStatus, verificationData?: NormalizedTransactionData) {
    assert(status === AttestationStatus.valid ? verificationData : true, `valid attestation must have valid vefificationData`);

    // set status
    tx.status = status;

    tx.verificationData = verificationData!;

    //this.chainManager.logger.info(`    * chain ${this.chainName} processed ${tx.data.id} status=${status}  (${this.transactionsQueue.length},${this.transactionsProcessing.length},${this.transactionsDone.length}++)`);

    // move into processed
    arrayRemoveElement(this.transactionsProcessing, tx);

    // todo: save transaction data

    if (tx.onProcessed !== undefined) {
      tx.onProcessed(tx);
    }

    if (tx.status !== AttestationStatus.tooLate) {
      // start next transaction
      this.startNext();
    }
  }

  ////////////////////////////////////////////
  // validate
  //
  // transaction into validation
  // (1) process
  // (2) queue - if processing is full
  ////////////////////////////////////////////
  // validate(activeEpoch: AttestationRound, data: AttestationData): Attestation {
  //   // attestation info
  //   //this.chainManager.logger.info(`    * chain ${this.chainName} validate ${data.id}`);

  //   const transaction = new Attestation();
  //   transaction.attesterEpoch = activeEpoch;
  //   transaction.epochId = activeEpoch.epochId;
  //   transaction.chainNode = this;
  //   transaction.data = data;

  //   // check if transaction can be added into processing
  //   if (this.canProcess()) {
  //     this.process(transaction);
  //   } else {
  //     this.queue(transaction);
  //   }

  //   return transaction;
  // }

  validate(transaction: Attestation) {
    //this.chainManager.logger.info(`    * chain ${this.chainName} validate ${data.id}`);
    transaction.chainNode = this;

    // check if transaction can be added into processing
    if (this.canProcess()) {
      this.process(transaction);
    } else {
      this.queue(transaction);
    }
  }

  ////////////////////////////////////////////
  // startNext
  // start next queued transaction
  ////////////////////////////////////////////
  startNext() {
    if (!this.canProcess()) {
      if (this.transactionsProcessing.length === 0) {
        this.chainManager.logger.debug(` # startNext heartbeat`);
        setTimeout(() => {
          this.startNext();
        }, 100);
        // todo: for how long do I want to wait??????
      }
      //
      return;
    }

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
