import { Managed, toBN } from "@flarenetwork/mcc";
import { exit } from "process";
import { SourceRouter } from "../source/SourceRouter";
import { DatabaseService } from "../utils/databaseService";
import { EpochSettings } from "../utils/EpochSettings";
import { getTimeMilli } from "../utils/internetTime";
import { AttLogger, logException } from "../utils/logger";
import { safeCatch } from "../utils/PromiseTimeout";
import { MOCK_NULL_WHEN_TESTING, round, sleepms } from "../utils/utils";
import { toSourceId } from "../verification/sources/sources";
import { Attestation, AttestationStatus } from "./Attestation";
import { AttestationData } from "./AttestationData";
import { AttestationRound } from "./AttestationRound";
import { AttestationClientConfig } from "./AttestationClientConfig";
import { AttesterState } from "./AttesterState";
import { FlareConnection } from "./FlareConnection";
import { AttestationConfigManager, sourceAndTypeSupported, SourceLimiterConfig } from "./DynamicAttestationConfig";

// export interface AttestationClientDebugCallbacks {
//   onChooseStart?: (roundId: number) => void;
//   onBitVote?: (roundId: number) => void;
//   onCommitStart?: (roundId: number) => void;
//   onCommitSubmission?: (roundId: number) => void;
//   onCommitLimit?: (roundId: number) => void;
//   onRevealStart?: (roundId: number) => void;
//   onReveal?: (roundId: number) => void;
//   onCompleted?: (roundId: number) => void;
//   onFirstCommit?: (roundId: number) => void;
// }

const COMMIT_LIMIT_BUFFER_MS = 1000;
/**
 * Manages a specific attestation round
 */
@Managed()
export class AttestationRoundManager {
  logger: AttLogger;
  sourceRouter: SourceRouter;
  attestationConfigManager: AttestationConfigManager;
  dbServiceAttester: DatabaseService;

  state: AttesterState;

  startRoundId: number;
  _activeRoundId: number | undefined = undefined;

  rounds = new Map<number, AttestationRound>();
  config: AttestationClientConfig;
  flareConnection: FlareConnection;

  _initialized = false;

  // debugCallbacks: AttestationClientDebugCallbacks;

  constructor(
    config: AttestationClientConfig,
    logger: AttLogger,
    flareConnection: FlareConnection,
    sourceRouter?: SourceRouter
  ) {
    this.config = config;
    this.logger = logger;
    this.flareConnection = flareConnection;

    this.sourceRouter = sourceRouter ?? new SourceRouter(this);
    this.attestationConfigManager = new AttestationConfigManager(this);
  }

  get activeRoundId(): number {
    if(this._activeRoundId === undefined) {
      throw new Error("activeRoundId not defined")
    }
    return this._activeRoundId;
  }

  set activeRoundId(value: number) {
    this._activeRoundId = value;
  }

  get epochSettings(): EpochSettings {
    if(!this.flareConnection.epochSettings) {
      throw new Error("EpochSettings not yet initialized");
    }
    return this.flareConnection.epochSettings;
  }

  get label() {
    let label = ""
    if(this.config.label != "none") {
      label = `[${this.config.label}]`;
    }
    return label;
  }

  /**
   * Initializes attestation round manager
   */
  public async initialize(): Promise<void> {
    if(this._initialized) {
      throw new Error("AttestationRoundManager can be initialized only once");
    }
    // initialize activeRoundId for the first time, before first load of DAC, routings
    this.activeRoundId = this.epochSettings.getEpochIdForTime(toBN(getTimeMilli())).toNumber();

    // Load DAC configs
    await this.attestationConfigManager.initialize();

    this.dbServiceAttester = new DatabaseService(this.logger, this.config.attesterDatabase, "attester");
    await this.dbServiceAttester.connect();

    // update active round again since waiting for DB connection can take time
    this.activeRoundId = this.epochSettings.getEpochIdForTime(toBN(getTimeMilli())).toNumber();
    this.startRoundId = this.activeRoundId;

    this.state = new AttesterState(this.dbServiceAttester.manager);

    // eslint-disable-next-line    
    this.startRoundUpdate();

    this._initialized = true;
  }

  /**
   * Additional mechanism to update round manager when there are no requests
   */
  async startRoundUpdate(): Promise<void> {
    while (true) {
      try {
        const epochId: number = this.epochSettings.getEpochIdForTime(toBN(getTimeMilli())).toNumber();
        this.activeRoundId = epochId;

        const activeRound = this.getRoundOrCreateIt(epochId);
        await activeRound.initialize();

        await this.state.saveRoundComment(activeRound, activeRound.attestationsProcessed);
      } catch (error) {
        logException(error, `${this.label}startRoundUpdate`);
      }

      await sleepms(5000);
    }
  }

  /**
   * Gets the source handler configuration for a given @param name
   * @param name 
   * @returns 
   */
  getSourceLimiterConfig(name: string): SourceLimiterConfig {
    return this.attestationConfigManager.getSourceLimiterConfig(toSourceId(name), this.activeRoundId);
  }

  public onLastFlareNetworkTimestamp(timestamp: number) {
    // TODO
  }

  schedule(label: string, callback: () => void, after: number) {
    setTimeout(() => {
      safeCatch(label, callback);
    }, after);
  }

  /**
   * Gets the attestation round for a given @param epochId.
   * If the attestation round does not exist, it gets created, initialized and registered.
   * @param roundId 
   * @returns attestation round for given @param roundId
   */
  getRoundOrCreateIt(roundId: number): AttestationRound {
    // all times are in milliseconds
    const now = getTimeMilli();
    const chooseWindowDuration = this.flareConnection.chooseDeadlineSec * 1000;
    const windowDuration = this.flareConnection.roundDurationSec * 1000;
    const roundStartTime = this.epochSettings.getRoundIdTimeStartMs(roundId);
    const roundChooseStartTime: number = roundStartTime + windowDuration;
    const roundCommitStartTime: number = roundStartTime + windowDuration + chooseWindowDuration;
    const roundRevealStartTime: number = roundStartTime + 2 * windowDuration;
    const roundCompleteTime: number = roundStartTime + 3 * windowDuration;

    let activeRound = this.rounds.get(roundId);

    // check if attester epoch already exists - if not - create a new one and assign callbacks
    if (activeRound === undefined) {
      // check if DAC exists for this round id
      const config = this.attestationConfigManager.getConfig(roundId);

      if (!config) {
        this.logger.error(`${this.label}${roundId}: critical error, DAC config for round id not defined`);
        exit(1);
        return MOCK_NULL_WHEN_TESTING;
      }

      // check if verifier router exists for this round id exist
      const verifier = this.attestationConfigManager.getVerifierRouter(roundId);

      if (!verifier) {
        this.logger.error(`${this.label}${roundId}: critical error, verifier route for round id not defined`);
        exit(1);
        return MOCK_NULL_WHEN_TESTING;
      }

      this.sourceRouter.initializeSources(roundId);

      // create new round
      activeRound = new AttestationRound(roundId, config, this);

      const intervalId = setInterval(() => {
        const now = getTimeMilli();
        if (now > roundCommitStartTime) {
          clearInterval(intervalId);
        }
        const eta = (windowDuration - (now - roundStartTime)) / 1000;
        if (eta >= 0) {
          this.logger.debug(
            `${this.label}!round: ^Y#${activeRound.roundId}^^ ETA: ${round(eta, 0)} sec ^Wattestation requests: ${activeRound.attestationsProcessed}/${activeRound.attestations.length
            }  `
          );
        }
      }, process.env.TEST_SAMPLING_REQUEST_INTERVAL ? parseInt(process.env.TEST_SAMPLING_REQUEST_INTERVAL, 10) : 5000);

      // setup commit, reveal and completed callbacks
      this.logger.info(`${this.label}^w^Rcollect phase started^^ round ^Y#${roundId}^^`);

      // trigger start choose phase
      this.schedule(`${this.label}schedule:startChoosePhase`, async () => await activeRound!.startChoosePhase(), roundChooseStartTime - now);

      // trigger sending bit vote result
      this.schedule(`${this.label}schedule:bitVote`, async () => await activeRound!.bitVote(), roundCommitStartTime + this.config.bitVoteTimeSec - now);

      // trigger start commit phase
      this.schedule(`${this.label}schedule:startCommitPhase`, async () => await activeRound!.startCommitPhase(), roundCommitStartTime - now);

      // trigger start commit epoch submit
      this.schedule(`${this.label}schedule:startCommitSubmit`, () => activeRound!.startCommitSubmit(), roundCommitStartTime - now + 1000);

      // trigger start reveal epoch
      this.schedule(`${this.label}schedule:startRevealEpoch`, () => activeRound!.startRevealPhase(), roundRevealStartTime - now);

      // trigger end of commit time (if attestations were not done until here then the epoch will not be submitted)
      this.schedule(`${this.label}schedule:commitLimit`, () => activeRound!.commitLimit(), roundRevealStartTime + this.config.commitTimeSec * 1000 - COMMIT_LIMIT_BUFFER_MS - now);

      // trigger reveal
      this.schedule(`${this.label}schedule:reveal`, () => activeRound!.reveal(), roundCompleteTime + this.config.commitTimeSec * 1000 - now);

      // trigger end of reveal epoch, cycle is completed at this point
      this.schedule(`${this.label}schedule:completed`, () => activeRound!.completed(), roundCompleteTime - now);

      this.rounds.set(roundId, activeRound);

      this.cleanup();

      activeRound.commitEndTime = roundRevealStartTime + this.config.commitTimeSec * 1000;

      // link rounds
      const prevRound = this.rounds.get(roundId - 1);
      if (prevRound) {
        activeRound.prevRound = prevRound;
        prevRound.nextRound = activeRound;
      } else {
        // trigger first commit
        this.schedule(`${this.label}schedule:firstCommit`, () => activeRound!.firstCommit(), roundRevealStartTime + this.config.commitTimeSec * 1000 - now);
      }
    }

    return activeRound;
  }

  /**
   * Creates an attestation from attestation data and adds it to the active round
   * @param attestationData 
   * @returns 
   */
  public async attestate(attestationData: AttestationData) {
    const epochId: number = this.epochSettings.getEpochIdForTime(attestationData.timeStamp.mul(toBN(1000))).toNumber();

    this.activeRoundId = this.epochSettings.getEpochIdForTime(toBN(getTimeMilli())).toNumber();

    if (epochId < this.startRoundId) {
      this.logger.debug(`${this.label}epoch too low ^Y#${epochId}^^`);
      return;
    }

    const activeRound = this.getRoundOrCreateIt(epochId);
    await activeRound.initialize();

    // create, check and add attestation. If attestation is not ok, status is set to 'invalid'
    const attestation = await this.createAttestation(activeRound, attestationData);

    // attestation is added to the list, if non-duplicate. Invalid attestations are markd as processed
    activeRound.addAttestation(attestation);

    await this.state.saveRoundComment(activeRound, activeRound.attestationsProcessed);
  }

  cleanup() {
    const epochId = this.epochSettings.getCurrentEpochId().toNumber();

    // clear old epochs
    if (this.rounds.has(epochId - 10)) {
      this.rounds.delete(epochId - 10);
    }
  }

  /**
   * Creates attestation from the round and data.
   * @param round 
   * @param data 
   * @returns 
   */
  async createAttestation(round: AttestationRound, data: AttestationData): Promise<Attestation> {
    const attestation = new Attestation(round, data);

    // both validated on round initialization and must exist
    const config = this.attestationConfigManager.getConfig(round.roundId);
    const verifier = this.attestationConfigManager.getVerifierRouter(round.roundId);

    const attestationSupported = sourceAndTypeSupported(config, data.sourceId, data.type); 
    if (!attestationSupported || !verifier.isSupported(data.sourceId, data.type)) {
      attestation.status = AttestationStatus.failed;
      return attestation;
    }

    // attestation can be verified
    this.augmentCutoffTimes(attestation);

    return attestation;
  }

  /**
   * Auxillary function to calculate query window start time in no lower bound for block was given.
   * The time is calculated relative to the `roundId`
   * @param roundId 
   * @returns 
   */
  private windowStartTime(attestation: Attestation) {
    let roundId = attestation.roundId;
    let sourceId = attestation.data.sourceId;
    const roundStartTime = Math.floor(this.epochSettings.getRoundIdTimeStartMs(roundId) / 1000);
    const queryWindowsInSec = this.attestationConfigManager.getSourceLimiterConfig(
      sourceId,
      roundId
    ).queryWindowInSec;
    return roundStartTime - queryWindowsInSec;
  }


  /**
   * Adds minimum block timestamp (`windowStartTime`) and fork cut-off time for upper bound proof to the attestation, 
   * both calculated relative to the `roundId`.
   * @param attestation 
   */
  private augmentCutoffTimes(attestation: Attestation) {
    attestation.windowStartTime = this.windowStartTime(attestation);
  }

  // /**
  //  * Sets the debug callbacks. Used for testing purposes only.
  //  * @param callbacks 
  //  */
  // setDebugCallbacks(callbacks: AttestationClientDebugCallbacks) {
  //   this.debugCallbacks = callbacks;
  // }

}
