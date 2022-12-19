import { Managed } from "@flarenetwork/mcc";
import assert from "assert";
import { Attestation, AttestationStatus } from "../attester/Attestation";
import { AttestationRoundManager } from "../attester/AttestationRoundManager";
import { getTimeMilli, getTimeSec } from "../utils/internetTime";
import { logException } from "../utils/logger";
import { PriorityQueue } from "../utils/priorityQueue";
import { arrayRemoveElement } from "../utils/utils";
import { Verification, VerificationStatus } from "../verification/attestation-types/attestation-types";
import { AttestationRequestParseError } from "../verification/generated/attestation-request-parse";
import { VerifierRouter } from "../verification/routing/VerifierRouter";
import { WrongAttestationTypeError, WrongSourceIdError } from "../verification/verifiers/verifier_routing";
import { ChainConfiguration } from "./ChainConfiguration";

@Managed()
export class SourceManager {
  attestationRoundManager: AttestationRoundManager;
  // source manager rate limiting control
  requestTime = 0;
  requestsPerSecond = 0;

  chainConfig: ChainConfiguration;

  attestationsQueue = new Array<Attestation>();
  attestationsPriorityQueue = new PriorityQueue<Attestation>();

  attestationProcessing = new Array<Attestation>();

  delayQueueTimer: NodeJS.Timeout | undefined = undefined;
  delayQueueStartTime = 0;

  verifierRouter: VerifierRouter;

  constructor(attestationRoundManager: AttestationRoundManager, chainConfiguration: ChainConfiguration) {
    this.attestationRoundManager = attestationRoundManager;
    this.chainConfig = chainConfiguration;
  }

  get sourceRouter() {
    return this.attestationRoundManager.sourceRouter;
  }


  /**
   * Initializes SourceManager class (async initializations)
   */
  public async initialize() {
    this.verifierRouter = new VerifierRouter();
    await this.verifierRouter.initialize();
  }

  onSend(inProcessing?: number, inQueue?: number) {
    this.addRequestCount();
  }

  canAddRequests() {
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

  canProcess() {
    return this.canAddRequests() && this.attestationProcessing.length < this.chainConfig.maxProcessingTransactions;
  }

  /**
   * Adds the attestation into processing queue waiting for validation
   * @param attestation
   */
  queue(attestation: Attestation) {
    //this.sourceRouter.logger.info(`chain ${this.chainName} queue ${attestation.data.id} (${this.attestationQueue.length}++,${this.attestationProcessing.length},${this.transactionsDone.length})`);
    attestation.status = AttestationStatus.queued;
    this.attestationsQueue.push(attestation);
  }

  /**
   * Puts attestation from processing queue into into delay queue - queue that can be processed in second part of commit epoch.
   * It makes sure there is a mechanism that will run startNext if nothing is in process
   * @param attestation 
   * @param startTime delay time in sec
   */
  delayQueue(attestation: Attestation, startTime: number) {
    switch (attestation.status) {
      case AttestationStatus.queued:
        arrayRemoveElement(this.attestationsQueue, attestation);
        break;
      case AttestationStatus.processing:
        arrayRemoveElement(this.attestationProcessing, attestation);
        break;
    }

    this.attestationsPriorityQueue.push(attestation, startTime);

    this.updateDelayQueueTimer();
  }

  updateDelayQueueTimer(): void {
    if (this.attestationsPriorityQueue.length() == 0) return;

    // set time to first time in queue
    const firstStartTime = this.attestationsPriorityQueue.peekKey()!;

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
        this.sourceRouter.logger.debug(`priority queue timeout`);

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
    //this.sourceRouter.logger.info(`chain ${this.chainName} process ${tx.data.id}  (${this.transactionsQueue.length},${this.transactionsProcessing.length}++,${this.transactionsDone.length})`);

    const now = getTimeMilli();

    // check if the transaction is too late
    if (now > attestation.round.commitEndTime) {
      //this.sourceRouter.logger.error(`chain ${tx.epochId} transaction too late to process`);

      attestation.status = AttestationStatus.tooLate;

      this.processed(attestation, AttestationStatus.tooLate);

      return;
    }

    //this.addRequestCount();
    this.attestationProcessing.push(attestation);

    attestation.status = AttestationStatus.processing;
    attestation.processStartTime = now;

    // debug test fail
    let testFail = 0;
    if (process.env.TEST_FAIL) {
      testFail = attestation.reverification ? 0 : parseFloat(process.env.TEST_FAIL);
    }

    this.verifierRouter.verifyAttestation(attestation, attestation.reverification)
      .then((verification: Verification<any, any>) => {
        attestation.processEndTime = getTimeMilli();

        if (verification.status === VerificationStatus.RECHECK_LATER) {
          //this.sourceRouter.logger.warning(`reverification ${attestation.data.request}`);

          attestation.reverification = true;

          // actual time when attestion will be rechecked
          const startTimeMs =
            this.attestationRoundManager.epochSettings.getRoundIdRevealTimeStartMs(attestation.roundId) -
            this.attestationRoundManager.attestationConfigManager.config.commitTime * 1000 -
            this.chainConfig.reverificationTimeOffset * 1000;

          this.delayQueue(attestation, startTimeMs);
        } else if (verification.status === VerificationStatus.SYSTEM_FAILURE) {
          // TODO: handle this case and do not commit
          // TODO: message other clients or what? do not submit? do not submit that source???
          this.sourceRouter.logger.error2(`SYSTEM_FAILURE ${attestation.data.request}`);
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
          this.sourceRouter.logger.warning(`transaction verification error (retry ${attestation.retry})`);

          attestation.retry++;

          this.delayQueue(attestation, getTimeMilli() + this.chainConfig.delayBeforeRetry * 1000);
        } else {
          this.sourceRouter.logger.error2(`transaction verification error ${attestation.data.request}`);
          this.processed(attestation, AttestationStatus.invalid);
        }
      });
  }

  /**
   * Sets the Attestation status and adds verificationData to the attestation
   * @param attestation
   * @param status
   * @param verificationData
   */
  processed(attestation: Attestation, status: AttestationStatus, verificationData?: Verification<any, any>) {
    assert(status === AttestationStatus.valid ? verificationData : true, `valid attestation must have valid vefificationData`);

    // set status
    attestation.status = status;

    attestation.verificationData = verificationData!;

    //this.sourceRouter.logger.info(`chain ${this.chainName} processed ${tx.data.id} status=${status}  (${this.transactionsQueue.length},${this.transactionsProcessing.length},${this.transactionsDone.length}++)`);

    // move into processed
    arrayRemoveElement(this.attestationProcessing, attestation);

    // todo: save transaction data
    attestation.round.processed(attestation);

    if (attestation.status !== AttestationStatus.tooLate) {
      // start next transaction
      this.startNext();
    }
  }

  /**
   *If possible the attestation is processed, otherwise it is added the queue
   * @param attestation
   */
  validate(attestation: Attestation): void {
    //this.sourceRouter.logger.info(`chain ${this.chainName} validate ${transaction.data.getHash()}`);

    // check if transaction can be added into processing
    if (this.canProcess()) {
      // eslint-disable-next-line
      this.process(attestation);
    } else {
      this.queue(attestation);
    }
  }

  /**
   * Processes the next attestation in the priority queue if expected startTime of is reached otherwise the next attestation in the queue
   */
  startNext(): void {
    try {
      if (!this.canProcess()) {
        if (this.attestationProcessing.length === 0) {
          this.sourceRouter.logger.debug(` # startNext heartbeat`);
          setTimeout(() => {
            this.startNext();
          }, 100);
          // todo: for how long do I want to wait??????
        }
        //
        return;
      }

      // check if there is queued priority transaction to be processed
      while (this.attestationsPriorityQueue.length() && this.canProcess()) {
        // check if queue start time is reached
        const startTime = this.attestationsPriorityQueue.peekKey()!;
        if (getTimeMilli() < startTime) break;

        // take top and process it then start new top timer
        const attestation = this.attestationsPriorityQueue.pop();
        this.updateDelayQueueTimer();

        // eslint-disable-next-line
        this.process(attestation!);
      }

      // check if there is any queued transaction to be processed
      while (this.attestationsQueue.length && this.canProcess()) {
        const attestation = this.attestationsQueue.shift();

        // eslint-disable-next-line
        this.process(attestation!);
      }
    } catch (error) {
      logException(error, `SourceManager::startNext`);
    }
  }
}
