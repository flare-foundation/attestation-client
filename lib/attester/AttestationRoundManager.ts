import { Managed, toBN } from "@flarenetwork/mcc";
import { SourceRouter } from "../source/SourceRouter";
import { DatabaseService } from "../utils/databaseService";
import { EpochSettings } from "../utils/EpochSettings";
import { getTimeMilli } from "../utils/internetTime";
import { AttLogger, getGlobalLogger, logException } from "../utils/logger";
import { safeCatch } from "../utils/PromiseTimeout";
import { round, sleepms } from "../utils/utils";
import { toSourceId } from "../verification/sources/sources";
import { Attestation } from "./Attestation";
import { AttestationData } from "./AttestationData";
import { AttestationRound } from "./AttestationRound";
import { AttesterClientConfiguration, AttesterCredentials } from "./AttesterClientConfiguration";
import { AttesterState } from "./AttesterState";
import { AttesterWeb3 } from "./AttesterWeb3";
import { AttestationConfigManager, SourceLimiterConfig } from "./DynamicAttestationConfig";
/**
 * Manages a specific attestation round
 */
@Managed()
export class AttestationRoundManager {
  logger: AttLogger;
  epochSettings: EpochSettings;
  sourceRouter: SourceRouter;
  attestationConfigManager: AttestationConfigManager;
  dbServiceIndexer: DatabaseService;
  dbServiceAttester: DatabaseService;

  state : AttesterState;

  startEpochId: number;
  activeEpochId: number;

  rounds = new Map<number, AttestationRound>();
  config: AttesterClientConfiguration;
  credentials: AttesterCredentials;
  attesterWeb3: AttesterWeb3;

  constructor(
    sourceRouter: SourceRouter,
    config: AttesterClientConfiguration,
    credentials: AttesterCredentials,
    logger: AttLogger,
    attesterWeb3: AttesterWeb3
  ) {
    this.config = config;
    this.credentials = credentials;
    this.logger = logger;
    this.attesterWeb3 = attesterWeb3;

    this.epochSettings = new EpochSettings(toBN(config.firstEpochStartTime), toBN(config.roundDurationSec));
    this.sourceRouter = sourceRouter;
    this.attestationConfigManager = new AttestationConfigManager(this);

    this.activeEpochId = this.epochSettings.getEpochIdForTime(toBN(getTimeMilli())).toNumber();

  }

  /**
   * Initializes attestation round manager
   */
  async initialize(): Promise<void> {
    await this.attestationConfigManager.initialize();

    this.dbServiceIndexer = new DatabaseService(this.logger, this.credentials.indexerDatabase, "indexer");
    await this.dbServiceIndexer.connect();

    this.dbServiceAttester = new DatabaseService(this.logger, this.credentials.attesterDatabase, "attester");
    await this.dbServiceAttester.connect();

    // update active round again since waitin for DB connection can take time
    this.activeEpochId = this.epochSettings.getEpochIdForTime(toBN(getTimeMilli())).toNumber();
    this.startEpochId = this.activeEpochId;

    // eslint-disable-next-line    
    this.startRoundUpdate();

    this.state = new AttesterState(this.dbServiceAttester.manager);
  }

  /**
   * Additional mechanism to update round manager when there are no requests
   */
  async startRoundUpdate(): Promise<void> {
    while (true) {
      try {
        const epochId: number = this.epochSettings.getEpochIdForTime(toBN(getTimeMilli())).toNumber();
        this.activeEpochId = epochId;

        const activeRound = this.getRoundOrCreateIt(epochId);

        await this.state.saveRoundComment(activeRound, activeRound.attestationsProcessed);
      } catch (error) {
        logException(error, `startRoundUpdate`);
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
    return this.attestationConfigManager.getSourceLimiterConfig(toSourceId(name), this.activeEpochId);
  }

  /**
   * Gets the attestation round for a given @param epochId.
   * If the attestation round does not exist, it gets created, initialized and registered.
   * @param epochId 
   * @returns attestation round for given @param epochId
   */
  getRoundOrCreateIt(epochId: number): AttestationRound {
    // all times are in milliseconds
    const now = getTimeMilli();
    const epochTimeStart = this.epochSettings.getRoundIdTimeStartMs(epochId);
    const epochCommitTime: number = epochTimeStart + this.config.roundDurationSec * 1000;
    const epochRevealTime: number = epochCommitTime + this.config.roundDurationSec * 1000;
    const epochCompleteTime: number = epochRevealTime + this.config.roundDurationSec * 1000;

    let activeRound = this.rounds.get(epochId);

    // check if attester epoch already exists - if not - create a new one and assign callbacks
    if (activeRound === undefined) {
      activeRound = new AttestationRound(epochId, this);

      const intervalId = setInterval(() => {
        const now = getTimeMilli();
        if (now > epochCommitTime) {
          clearInterval(intervalId);
        }
        const eta = 90 - (now - epochTimeStart) / 1000;
        if (eta >= 0) {
          getGlobalLogger().debug(
            `!round: ^Y#${activeRound.roundId}^^ ETA: ${round(eta, 0)} sec ^Wtransactions: ${activeRound.attestationsProcessed}/${activeRound.attestations.length
            }  `
          );
        }
      }, 5000);

      // setup commit, reveal and completed callbacks
      this.logger.info(`^w^Rcollect epoch started^^ round ^Y#${epochId}^^`);

      // trigger start commit epoch
      setTimeout(() => {
        safeCatch(`setTimeout:startCommitEpoch`, async () => await activeRound!.startCommitEpoch());
      }, epochCommitTime - now);

      // trigger start commit epoch submit
      setTimeout(() => {
        safeCatch(`setTimeout:startCommitEpoch`, () => activeRound!.startCommitSubmit());
      }, epochCommitTime - now + 1000);

      // trigger start reveal epoch
      setTimeout(() => {
        safeCatch(`setTimeout:startRevealEpoch`, () => activeRound!.startRevealEpoch());
      }, epochRevealTime - now);

      // trigger end of commit time (if attestations were not done until here then the epoch will not be submitted)
      setTimeout(() => {
        safeCatch(`setTimeout:commitLimit`, () => activeRound!.commitLimit());
      }, epochRevealTime - this.config.commitTime * 1000 - 1000 - now);

      // trigger reveal
      setTimeout(() => {
        safeCatch(`setTimeout:reveal`, () => activeRound!.reveal());
      }, epochCompleteTime - this.config.commitTime * 1000 - now);

      // trigger end of reveal epoch, cycle is completed at this point
      setTimeout(() => {
        safeCatch(`setTimeout:completed`, () => activeRound!.completed());
      }, epochCompleteTime - now);

      this.rounds.set(epochId, activeRound);

      this.cleanup();

      activeRound.commitEndTime = epochRevealTime - this.config.commitTime * 1000;

      // link rounds
      const prevRound = this.rounds.get(epochId - 1);
      if (prevRound) {
        activeRound.prevRound = prevRound;
        prevRound.nextRound = activeRound;
      } else {
        // trigger first commit
        setTimeout(() => {
          safeCatch(`setTimeout:firstCommit`, () => activeRound!.firstCommit());
        }, epochRevealTime - this.config.commitTime * 1000 - now);
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

    this.activeEpochId = this.epochSettings.getEpochIdForTime(toBN(getTimeMilli())).toNumber();

    if (epochId < this.startEpochId) {
      this.logger.debug(`epoch too low ^Y#${epochId}^^`);
      return;
    }

    const activeRound = this.getRoundOrCreateIt(epochId);

    // create, check and add attestation
    const attestation = await this.createAttestation(activeRound, attestationData);

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
    // create attestation depending on attestation type
    const attestation = new Attestation(round, data);
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
   * Auxillary function to calculate fork cut-off time.
   * The time is calculated relative to the `roundId`
   * @param roundId 
   * @returns 
   */
  private UBPCutoffTime(attestation: Attestation) {
    let roundId = attestation.roundId;
    let sourceId = attestation.data.sourceId;
    const roundStartTime = Math.floor(this.epochSettings.getRoundIdTimeStartMs(roundId) / 1000);
    const UBPUnconfirmedWindowInSec = this.attestationConfigManager.getSourceLimiterConfig(
      sourceId,
      roundId
    ).UBPUnconfirmedWindowInSec;
    return roundStartTime - UBPUnconfirmedWindowInSec;
  }

  /**
   * Adds minimum block timestamp (`windowStartTime`) and fork cut-off time for upper bound proof to the attestation, 
   * both calculated relative to the `roundId`.
   * @param attestation 
   */
  private augmentCutoffTimes(attestation: Attestation) {
    attestation.windowStartTime = this.windowStartTime(attestation);
    attestation.UBPCutoffTime = this.UBPCutoffTime(attestation)
  }

}
