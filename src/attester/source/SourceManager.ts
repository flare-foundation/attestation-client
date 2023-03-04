import { Managed } from "@flarenetwork/mcc";
import assert from "assert";
import { exit } from "process";
import { criticalAsync } from "../../indexer/indexer-utils";
import { PriorityQueue } from "../../utils/data-structures/PriorityQueue";
import { getTimeMilli, getTimeSec } from "../../utils/helpers/internetTime";
import { arrayRemoveElement } from "../../utils/helpers/utils";
import { AttLogger, logException } from "../../utils/logging/logger";
import { MIC_SALT, Verification, VerificationStatus } from "../../verification/attestation-types/attestation-types";
import { dataHash } from "../../verification/generated/attestation-hash-utils";
import { parseRequest } from "../../verification/generated/attestation-request-parse";
import { VerifierSourceRouteConfig } from "../../verification/routing/configs/VerifierSourceRouteConfig";
import { SourceId } from "../../verification/sources/sources";
import { Attestation } from "../Attestation";
import { GlobalConfigManager } from "../GlobalConfigManager";
import { AttestationStatus } from "../types/AttestationStatus";

@Managed()
export class SourceManager {
  globalConfigManager: GlobalConfigManager;
  // rate limiting control
  requestTime = 0;
  requestsPerSecond = 0;

  sourceId: SourceId;

  // queues
  attestationsQueue = new Array<Attestation>();
  attestationsPriorityQueue = new PriorityQueue<Attestation>();
  attestationProcessing = new Set<Attestation>();

  delayQueueTimer: NodeJS.Timeout | undefined = undefined;
  delayQueueStartTime = 0;

  latestRoundId = 0;

  constructor(globalConfigManager: GlobalConfigManager, sourceId: SourceId) {
    this.globalConfigManager = globalConfigManager;
    this.sourceId = sourceId;
  }

  get verifierSourceConfig(): VerifierSourceRouteConfig | undefined {
    const config = this.globalConfigManager.getVerifierRouter(this.latestRoundId).config;
    if (!config) return;
    return config.getSourceConfig(this.sourceId);
  }

  get maxRequestsPerSecond(): number {
    const config = this.verifierSourceConfig;
    if (!config) return Infinity; // requests will be rejected anyway, since there is no routing
    return config.maxRequestsPerSecond;
  }

  get maxProcessingTransactions(): number {
    const config = this.verifierSourceConfig;
    if (!config) return Infinity; // requests will be rejected anyway, since there is no routing
    return config.maxProcessingTransactions;
  }

  get maxFailedRetries(): number {
    const config = this.verifierSourceConfig;
    if (!config) return 3; // requests will be rejected anyway, since there is no routing
    return config.maxFailedRetries;
  }

  get delayBeforeRetryMs(): number {
    const config = this.verifierSourceConfig;
    if (!config) return 100; // requests will be rejected anyway, since there is no routing
    return config.delayBeforeRetryMs;
  }
  /**
   * Refreshes verifier source configuration for given roundId.
   * @param sourceId
   * @param roundId
   */
  public refreshLatestRoundId(roundId: number) {
    if (this.latestRoundId > roundId) return;
    this.latestRoundId = roundId;
  }

  /**
   * Returns logger.
   */
  public get logger(): AttLogger {
    return this.globalConfigManager.logger;
  }

  /**
   * Returns attestation client label for logging.
   */
  public get label() {
    return this.globalConfigManager.label;
  }

  /**
   * Returns `true` if new attestation requests can be added for processing (subject to rate limit).
   * @returns
   */
  private canProcessRequestsInThisSecond() {
    const time = getTimeSec();
    // second shifted, new quota
    if (this.requestTime !== time) return true;
    // still the same quota, count requests
    return this.requestsPerSecond < this.maxRequestsPerSecond;
  }

  /**
   * Increases sent request count. Used for managing rate limits.
   */
  private increaseRequestCount() {
    const time = getTimeSec();

    if (this.requestTime === time) {
      this.requestsPerSecond++;
    } else {
      this.requestTime = time;
      this.requestsPerSecond = 0;
    }
  }

  /**
   * Returns true if an additional request can be processed. It checks whether rate limit is achieved for current second
   * and if maximal number of transactions that can be processed simultaneously is achieved.
   * @returns
   */
  private canProcessNextAttestation() {
    return this.canProcessRequestsInThisSecond() && this.attestationProcessing.size < this.maxProcessingTransactions;
  }

  /**
   * Adds the attestation into processing queue waiting for verification
   * @param attestation
   */
  private enQueue(attestation: Attestation) {
    //this.logger.info(`chain ${this.chainName} queue ${attestation.data.id} (${this.attestationQueue.length}++,${this.attestationProcessing.length},${this.transactionsDone.length})`);
    attestation.status = AttestationStatus.queued;
    this.attestationsQueue.push(attestation);
  }

  /**
   * Puts attestation from processing queue into into delay queue priority queue
   * It makes sure there is a mechanism that will run startNext if nothing is in process
   * @param attestation
   * @param startTime delay time in sec
   */
  private enQueueDelayed(attestation: Attestation, startTime: number) {
    switch (attestation.status) {
      case AttestationStatus.queued:
        arrayRemoveElement(this.attestationsQueue, attestation);
        break;
      case AttestationStatus.processing:
        this.attestationProcessing.delete(attestation);
        break;
    }

    this.attestationsPriorityQueue.push(attestation, startTime);
    this.updateDelayQueueTimer();
  }

  private updateDelayQueueTimer(): void {
    if (this.attestationsPriorityQueue.length() == 0) return;

    // set time to the first time in queue
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
  private async process(attestation: Attestation) {
    //this.logger.info(`chain ${this.chainName} process ${tx.data.id}  (${this.transactionsQueue.length},${this.transactionsProcessing.length}++,${this.transactionsDone.length})`);

    const verifierRouter = this.globalConfigManager.getVerifierRouter(attestation.roundId);
    // Check if active verifier supports attestation

    // Check again, if verifier supports the attestation type
    if (!verifierRouter || !verifierRouter.isSupported(attestation.data.sourceId, attestation.data.type)) {
      this.logger.info(`No verifier routes for source '${attestation.data.sourceId}' and type '${attestation.data.type}'`);
      this.onProcessed(attestation, AttestationStatus.failed);
      return;
    }

    const now = getTimeMilli();

    // check if the transaction is too late
    if (now > attestation.round.commitEndTimeMs) {
      this.logger.info(`Attestation ${attestation.data.request} too late to process`);
      this.onProcessed(attestation, AttestationStatus.tooLate);
      return;
    }

    //this.addRequestCount();
    this.attestationProcessing.add(attestation);

    attestation.status = AttestationStatus.processing;
    attestation.processStartTime = now;

    // debug test fail
    let testFail = 0;
    if (process.env.TEST_FAIL) {
      testFail = attestation.reverification ? 0 : parseFloat(process.env.TEST_FAIL);
    }
    // assert
    if (!verifierRouter) {
      // This should not happen as this is checked already on AttestationRound creation
      this.logger.error(`${this.label}Assert. Critical error. VerifierRouter does not exist in SourceManager for roundId ${attestation.roundId}`);
      exit(1);
    }

    this.increaseRequestCount();
    verifierRouter
      .verifyAttestation(attestation)
      .then((verification: Verification<any, any>) => {
        attestation.processEndTime = getTimeMilli();
        let status = verification.status;
        if (status === VerificationStatus.OK) {
          // check message integrity
          const originalRequest = parseRequest(attestation.data.request);
          const micOk = originalRequest.messageIntegrityCode === dataHash(originalRequest, verification.response, MIC_SALT);
          if (micOk) {
            this.onProcessed(attestation, AttestationStatus.valid, verification);
            return;
          }
          this.logger.debug(`${this.label}WRONG MIC for ${attestation.data.request}`);
        }

        if (verification.status === VerificationStatus.SYSTEM_FAILURE) {
          this.logger.error2(`${this.label}SYSTEM_FAILURE ${attestation.data.request}`);
        }

        // The verification is invalid or mic does not match
        this.onProcessed(attestation, AttestationStatus.invalid, verification);
      })
      .catch((error: any) => {
        // Exception happens on API errors, both the ones that return status ERROR and ones that fail.
        // In both cases the default direction is retry
        logException(error, `${this.label}verifyAttestation ${error}`);
        attestation.exception = error;

        // Retries
        attestation.processEndTime = getTimeMilli();
        if (attestation.retry < this.maxFailedRetries) {
          this.logger.warning(`${this.label}transaction verification error (retry ${attestation.retry})`);
          attestation.retry++;
          this.enQueueDelayed(attestation, getTimeMilli() + this.delayBeforeRetryMs);
        } else {
          this.logger.error2(`${this.label}transaction verification error ${attestation.data.request}`);
          this.onProcessed(attestation, AttestationStatus.invalid);
        }
      });
  }

  /**
   * A callback to be called when an attestation is processed.
   * Sets the Attestation status and adds verificationData to the attestation
   * @param attestation
   * @param status
   * @param verificationData
   */
  private onProcessed(attestation: Attestation, status: AttestationStatus, verificationData?: Verification<any, any>) {
    assert(status === AttestationStatus.valid ? verificationData : true, `valid attestation must have valid verificationData`);

    // set status
    attestation.status = status;
    attestation.verificationData = verificationData!;

    // augument the attestation response with the round id
    if (attestation.verificationData?.response) {
      attestation.verificationData.response.stateConnectorRound = attestation.roundId;
    }

    // move into processed
    this.attestationProcessing.delete(attestation);

    // signal a new attestation was processed
    attestation.round.onAttestationProcessed(attestation);

    if (attestation.status !== AttestationStatus.tooLate) {
      // start next transaction
      this.startNext();
    }
  }

  /**
   * Verifies the attestation request.
   * If possible the attestation is processed, otherwise it is added the queue.
   * @param attestation
   */
  public verifyAttestationRequest(attestation: Attestation): void {
    //this.logger.info(`chain ${this.chainName} validate ${transaction.data.getHash()}`);

    // check if transaction can be added into processing
    if (this.canProcessNextAttestation()) {
      // eslint-disable-next-line
      criticalAsync(`SourceManager::validate::process`, () => this.process(attestation));
    } else {
      this.enQueue(attestation);
    }
  }

  /**
   * Processes the next attestation in the priority queue if expected startTime
   * of is reached otherwise the next attestation in the queue
   */
  private startNext(): void {
    try {
      if (!this.canProcessNextAttestation()) {
        if (this.attestationProcessing.size === 0) {
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
      while (this.attestationsPriorityQueue.length() && this.canProcessNextAttestation()) {
        // check if queue start time is reached
        const startTime = this.attestationsPriorityQueue.peekKey()!;
        if (getTimeMilli() < startTime) break;

        // take top and process it then start new top timer
        const attestation = this.attestationsPriorityQueue.pop();
        this.updateDelayQueueTimer();

        // eslint-disable-next-line
        criticalAsync(`SourceManager::startNext::process-1`, () => this.process(attestation!));
      }

      // check if there is any queued transaction to be processed
      while (this.attestationsQueue.length && this.canProcessNextAttestation()) {
        const attestation = this.attestationsQueue.shift();

        // eslint-disable-next-line
        criticalAsync(`SourceManager::startNext::process-2`, () => this.process(attestation!));
      }
    } catch (error) {
      logException(error, `${this.label}SourceManager::startNext`);
    }
  }
}
