import { Managed } from "@flarenetwork/mcc";
import assert from "assert";
import { exit } from "process";
import { Attestation, AttestationStatus } from "../attester/Attestation";
import { AttestationRoundManager } from "../attester/AttestationRoundManager";
import { getTimeMilli, getTimeSec } from "../utils/internetTime";
import { AttLogger, logException } from "../utils/logger";
import { PriorityQueue } from "../utils/priorityQueue";
import { arrayRemoveElement } from "../utils/utils";
import { MIC_SALT, Verification, VerificationStatus } from "../verification/attestation-types/attestation-types";
import { dataHash } from "../verification/generated/attestation-hash-utils";
import { AttestationRequestParseError, parseRequest } from "../verification/generated/attestation-request-parse";
import { getSourceConfig } from "../verification/routing/configs/VerifierRouteConfig";
import { VerifierSourceRouteConfig } from "../verification/routing/configs/VerifierSourceRouteConfig";
import { InvalidRouteError } from "../verification/routing/VerifierRouter";
import { SourceId } from "../verification/sources/sources";
import { WrongAttestationTypeError, WrongSourceIdError } from "../verification/verifiers/verifier_routing";

@Managed()
export class SourceManager {
  attestationRoundManager: AttestationRoundManager;
  // source manager rate limiting control
  requestTime = 0;
  requestsPerSecond = 0;

  verifierSourceConfig: VerifierSourceRouteConfig;

  attestationsQueue = new Array<Attestation>();
  attestationsPriorityQueue = new PriorityQueue<Attestation>();

  attestationProcessing = new Array<Attestation>();

  delayQueueTimer: NodeJS.Timeout | undefined = undefined;
  delayQueueStartTime = 0;

  constructor(attestationRoundManager: AttestationRoundManager) {
    this.attestationRoundManager = attestationRoundManager;
  }

  setConfig(sourceId: SourceId, roundId: number) {
    let verifierRouteConfig = this.attestationRoundManager.attestationConfigManager.getVerifierRouter(roundId).config;
    if (verifierRouteConfig) {
      this.verifierSourceConfig = getSourceConfig(verifierRouteConfig, sourceId);
    }
    if (!this.verifierSourceConfig) {
      if (process.env.NODE_ENV === "development") {
        // We allow for incomplete routing configs in development
        this.logger.info(`${this.label}${roundId}: source config for source ${sourceId} not defined (tolerated in "development" mode)`);
      } else {
        this.logger.error(`${this.label}${roundId}: critical error, verifier source config for source ${sourceId} not defined`);
        exit(1);
      }
    }
  }

  get logger(): AttLogger {
    return this.attestationRoundManager.logger;
  }

  get label() {
    return this.attestationRoundManager.label;
  }

  onSend(inProcessing?: number, inQueue?: number) {
    this.addRequestCount();
  }

  canAddRequests() {
    const time = getTimeSec();

    if (this.requestTime !== time) return true;

    return this.requestsPerSecond < this.verifierSourceConfig.maxRequestsPerSecond;
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
    return this.canAddRequests() && this.attestationProcessing.length < this.verifierSourceConfig.maxProcessingTransactions;
  }

  /**
   * Adds the attestation into processing queue waiting for validation
   * @param attestation
   */
  queue(attestation: Attestation) {
    //this.logger.info(`chain ${this.chainName} queue ${attestation.data.id} (${this.attestationQueue.length}++,${this.attestationProcessing.length},${this.transactionsDone.length})`);
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
        this.logger.debug(`${this.label}priority queue timeout`);

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
    //this.logger.info(`chain ${this.chainName} process ${tx.data.id}  (${this.transactionsQueue.length},${this.transactionsProcessing.length}++,${this.transactionsDone.length})`);

    const now = getTimeMilli();

    // check if the transaction is too late
    if (now > attestation.round.commitEndTime) {
      //this.logger.error(`chain ${tx.epochId} transaction too late to process`);

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

    // get verifierRouter from DAC 
    const verifierRouter = this.attestationRoundManager.attestationConfigManager.getVerifierRouter(attestation.roundId);

    verifierRouter.verifyAttestation(attestation)
      .then((verification: Verification<any, any>) => {
        attestation.processEndTime = getTimeMilli();

        // if (verification.status === VerificationStatus.RECHECK_LATER) {
        //   // Currently this case cannot happen. In future we may process a window of last N rounds
        //   // and reverifications may happen, but in a different manner.

        //   // this.logger.warning(`reverification ${attestation.data.request}`);

        //   attestation.reverification = true;

        //   // actual time when attestion will be rechecked
        //   const startTimeMs =
        //     this.attestationRoundManager.epochSettings.getRoundIdRevealTimeStartMs(attestation.roundId) -
        //     this.attestationRoundManager.attestationConfigManager.config.commitTimeSec * 1000 -
        //     this.verifierSourceConfig.reverificationTimeOffset * 1000;

        //   this.delayQueue(attestation, startTimeMs);
        // } else 

        let status = verification.status;
        if (status === VerificationStatus.OK) {
          const originalRequest = parseRequest(attestation.data.request);
          const micOk = originalRequest.messageIntegrityCode === dataHash(originalRequest, verification.response, MIC_SALT);
          if (micOk) {
            this.processed(attestation, AttestationStatus.valid, verification);
            return;
          }
          this.logger.debug(`${this.label}WRONG MIC for ${attestation.data.request}`);
        }

        if (verification.status === VerificationStatus.SYSTEM_FAILURE) {
          this.logger.error2(`${this.label}SYSTEM_FAILURE ${attestation.data.request}`);
        }

        // The verification is invalid or mic does not match
        this.processed(attestation, AttestationStatus.invalid, verification);
      })
      .catch((error: any) => {
        logException(error, `${this.label}verifyAttestation`);

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
        if (error instanceof InvalidRouteError) {
          this.processed(attestation, AttestationStatus.invalid);
        }

        // Retries
        attestation.processEndTime = getTimeMilli();
        if (attestation.retry < this.verifierSourceConfig.maxFailedRetry) {
          this.logger.warning(`${this.label}transaction verification error (retry ${attestation.retry})`);

          attestation.retry++;

          this.delayQueue(attestation, getTimeMilli() + this.verifierSourceConfig.delayBeforeRetry * 1000);
        } else {
          this.logger.error2(`${this.label}transaction verification error ${attestation.data.request}`);
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
    // augument the attestation response with the round id
    if (attestation.verificationData?.response) {
      attestation.verificationData.response.stateConnectorRound = attestation.roundId;
    }

    //this.logger.info(`chain ${this.chainName} processed ${tx.data.id} status=${status}  (${this.transactionsQueue.length},${this.transactionsProcessing.length},${this.transactionsDone.length}++)`);

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
    //this.logger.info(`chain ${this.chainName} validate ${transaction.data.getHash()}`);

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
          this.logger.debug(`${this.label} # startNext heartbeat`);
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
      logException(error, `${this.label}SourceManager::startNext`);
    }
  }
}
