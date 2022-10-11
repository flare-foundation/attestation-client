import assert from "assert";
import { ChainType, Managed, MCC, MccClient } from "@flarenetwork/mcc";
import { Attestation, AttestationStatus } from "../attester/Attestation";
import { AttestationRoundManager } from "../attester/AttestationRoundManager";
import { IndexedQueryManagerOptions } from "../indexed-query-manager/indexed-query-manager-types";
import { IndexedQueryManager } from "../indexed-query-manager/IndexedQueryManager";
import { getTimeMilli, getTimeSec } from "../utils/internetTime";
import { logException } from "../utils/logger";
import { PriorityQueue } from "../utils/priorityQueue";
import { arrayRemoveElement } from "../utils/utils";
import { Verification, VerificationStatus } from "../verification/attestation-types/attestation-types";
import { AttestationRequestParseError } from "../verification/generated/attestation-request-parse";
import { toSourceId } from "../verification/sources/sources";
import { verifyAttestation, WrongAttestationTypeError, WrongSourceIdError } from "../verification/verifiers/verifier_routing";
import { ChainConfiguration } from "./ChainConfiguration";
import { ChainManager } from "./ChainManager";

@Managed()
export class ChainNode {
  chainManager: ChainManager;

  chainName: string;
  chainType: ChainType; //index of chain supported by Flare. Should match chainName
  client: MccClient;

  // node rate limiting control
  requestTime: number = 0; //How is this used?
  requestsPerSecond: number = 0;

  chainConfig: ChainConfiguration;

  transactionsQueue = new Array<Attestation>();
  transactionsPriorityQueue = new PriorityQueue<Attestation>();

  transactionsProcessing = new Array<Attestation>();

  indexedQueryManager: IndexedQueryManager;

  delayQueueTimer: NodeJS.Timeout | undefined = undefined;
  delayQueueStartTime = 0;

  constructor(chainManager: ChainManager, chainName: string, chainType: ChainType, chainConfiguration: ChainConfiguration) {
    this.chainName = chainName;
    this.chainType = chainType;
    this.chainManager = chainManager;
    this.chainConfig = chainConfiguration;

    // create chain client
    this.client = MCC.Client(this.chainType, chainConfiguration.mccCreate);

    //const confirmations = AttestationRoundManager.attestationConfigManager.getSourceHandlerConfig( )

    let options: IndexedQueryManagerOptions = {
      chainType: chainType,
      dbService: AttestationRoundManager.dbServiceIndexer,
      maxValidIndexerDelaySec: chainConfiguration.maxValidIndexerDelaySec,

      numberOfConfirmations: () => {
        return AttestationRoundManager.getSourceHandlerConfig(chainConfiguration.name).numberOfConfirmations;
      },

      windowStartTime: (roundId: number) => {
        let roundStartTime = Math.floor(AttestationRoundManager.epochSettings.getRoundIdTimeStartMs(roundId) / 1000);
        const queryWindowsInSec = AttestationRoundManager.attestationConfigManager.getSourceHandlerConfig(
          toSourceId(chainConfiguration.name),
          roundId
        ).queryWindowInSec;
        return roundStartTime - queryWindowsInSec;
      },

      UBPCutoffTime: (roundId: number) => {
        let roundStartTime = Math.floor(AttestationRoundManager.epochSettings.getRoundIdTimeStartMs(roundId) / 1000);
        const UBPUnconfirmedWindowInSec = AttestationRoundManager.attestationConfigManager.getSourceHandlerConfig(
          toSourceId(chainConfiguration.name),
          roundId
        ).UBPUnconfirmedWindowInSec;
        return roundStartTime - UBPUnconfirmedWindowInSec;
      },
    };

    this.indexedQueryManager = new IndexedQueryManager(options);
  }

  onSend(inProcessing?: number, inQueue?: number) {
    this.addRequestCount();
  }

  getLoad(): number {
    return this.transactionsQueue.length + this.transactionsProcessing.length + this.transactionsPriorityQueue.length();
  }

  // ?????
  canAddRequests(): boolean {
    const time = getTimeSec();

    if (this.requestTime !== time) return true;

    return this.requestsPerSecond < this.chainConfig.maxRequestsPerSecond;
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

  /**
   *
   * @returns
   */
  canProcess(): boolean {
    return this.canAddRequests() && this.transactionsProcessing.length < this.chainConfig.maxProcessingTransactions;
  }

  /**
   * Adds the attestation into processing queue waiting for validation
   * @param attestation
   */
  queue(attestation: Attestation): void {
    //this.chainManager.logger.info(`chain ${this.chainName} queue ${attestation.data.id}  (${this.transactionsQueue.length}++,${this.transactionsProcessing.length},${this.transactionsDone.length})`);
    attestation.status = AttestationStatus.queued;
    this.transactionsQueue.push(attestation);
  }

  /**
   * puts attestation from processing queue into into delay queue - queue that can be processed in second part of commit epoch
   *
   * startTime is delay time in sec
   *
   * what this function does is to make sure there is a mechanism that will run startNext if nothing is in process
   */
  delayQueue(attestation: Attestation, startTime: number): void {
    switch (attestation.status) {
      case AttestationStatus.queued:
        arrayRemoveElement(this.transactionsQueue, attestation);
        break;
      case AttestationStatus.processing:
        arrayRemoveElement(this.transactionsProcessing, attestation);
        break;
    }

    this.transactionsPriorityQueue.push(attestation, startTime); //Priority or Delay ?

    this.updateDelayQueueTimer();
  }

  updateDelayQueueTimer(): void {
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
        this.chainManager.logger.debug(`priority queue timeout`);

        this.startNext();
        this.delayQueueTimer = undefined;
      }, firstStartTime - getTimeMilli());
    }
  }

  /**
   * Starts the validation process for the attestation
   * @param attestation
   * @returns
   */
  async process(attestation: Attestation) {
    //this.chainManager.logger.info(`chain ${this.chainName} process ${tx.data.id}  (${this.transactionsQueue.length},${this.transactionsProcessing.length}++,${this.transactionsDone.length})`);

    const now = getTimeMilli();

    // check if the transaction is too late
    if (now > attestation.round.commitEndTime) {
      //this.chainManager.logger.error(`chain ${tx.epochId} transaction too late to process`);

      attestation.status = AttestationStatus.tooLate;

      this.processed(attestation, AttestationStatus.tooLate);

      return;
    }

    //this.addRequestCount();
    this.transactionsProcessing.push(attestation);

    attestation.status = AttestationStatus.processing;
    attestation.processStartTime = now;

    // debug test fail
    let testFail = 0;
    if (process.env.TEST_FAIL) {
      testFail = attestation.reverification ? 0 : parseFloat(process.env.TEST_FAIL);
    }

    // TODO - failure simulation
    verifyAttestation(this.client, attestation, this.indexedQueryManager, attestation.reverification)
      .then((verification: Verification<any, any>) => {
        attestation.processEndTime = getTimeMilli();

        if (verification.status === VerificationStatus.RECHECK_LATER) {
          this.chainManager.logger.warning(`reverification ${attestation.data.request}`);

          attestation.reverification = true;

          // actualk time when attesttion will be rechecked
          const startTimeMs =
            AttestationRoundManager.epochSettings.getRoundIdRevealTimeStartMs(attestation.roundId) -
            AttestationRoundManager.attestationConfigManager.config.commitTime * 1000 -
            this.chainConfig.reverificationTimeOffset * 1000;

          this.delayQueue(attestation, startTimeMs);
        } else if (verification.status === VerificationStatus.SYSTEM_FAILURE) {
          // TODO: handle this case and do not commit
          // TODO: message other clients or what? do not submit? do not submit that source???
          this.chainManager.logger.error2(`SYSTEM_FAILURE ${attestation.data.request}`);
          this.processed(attestation, AttestationStatus.invalid, verification);
        } else {
          this.processed(attestation, verification.status === VerificationStatus.OK ? AttestationStatus.valid : AttestationStatus.invalid, verification);
        }
      })
      .catch((error: any) => {
        logException(error, "verifyAttestation");

        attestation.exception = error;

        // Attestation request parsing errors
        if (error instanceof WrongSourceIdError) {
          this.processed(attestation, AttestationStatus.invalid);
        }
        if (error instanceof WrongAttestationTypeError) {
          this.processed(attestation, AttestationStatus.invalid);
        }
        if (error instanceof AttestationRequestParseError) {
          this.processed(attestation, AttestationStatus.invalid);
        }

        // Retries
        attestation.processEndTime = getTimeMilli();
        if (attestation.retry < this.chainConfig.maxFailedRetry) {
          this.chainManager.logger.warning(`transaction verification error (retry ${attestation.retry})`);

          attestation.retry++;

          this.delayQueue(attestation, getTimeMilli() + this.chainConfig.delayBeforeRetry * 1000);
        } else {
          this.chainManager.logger.error2(`transaction verification error ${attestation.data.request}`);
          this.processed(attestation, AttestationStatus.invalid);
        }
      });
  }

  /**
   * Sets the Attestation status and adds varificationData to the attestation
   * @param attestation
   * @param status
   * @param verificationData
   */
  processed(attestation: Attestation, status: AttestationStatus, verificationData?: Verification<any, any>) {
    assert(status === AttestationStatus.valid ? verificationData : true, `valid attestation must have valid vefificationData`);

    // set status
    attestation.status = status;

    attestation.verificationData = verificationData!;

    //this.chainManager.logger.info(`chain ${this.chainName} processed ${attestation.data.id} status=${status}  (${this.transactionsQueue.length},${this.transactionsProcessing.length},${this.transactionsDone.length}++)`);

    // move into processed
    arrayRemoveElement(this.transactionsProcessing, attestation);

    // todo: save transaction data

    if (attestation.onProcessed !== undefined) {
      attestation.onProcessed(attestation);
    }

    if (attestation.status !== AttestationStatus.tooLate) {
      // start next transaction
      this.startNext();
    }
  }

  /**
   *Check if possible the attestation is processed, otherwise it is added  the queue
   * @param attestation
   */
  validate(attestation: Attestation): void {
    //this.chainManager.logger.info(`chain ${this.chainName} validate ${attestation.data.getHash()}`);

    // check if attestation can be added into processing
    if (this.canProcess()) {
      this.process(attestation);
    } else {
      this.queue(attestation);
    }
  }

  /**
   * Processes the next attestation in the queue
   * @returns
   */
  startNext(): void {
    try {
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
        const attestation = this.transactionsPriorityQueue.pop();
        this.updateDelayQueueTimer();

        this.process(attestation!);
      }

      // check if there is any queued transaction to be processed
      while (this.transactionsQueue.length && this.canProcess()) {
        const attestation = this.transactionsQueue.shift();

        this.process(attestation!);
      }
    } catch (error) {
      logException(error, `ChainNode::startNext`);
    }
  }
}
