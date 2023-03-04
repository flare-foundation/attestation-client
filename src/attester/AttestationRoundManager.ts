import { Managed, toBN } from "@flarenetwork/mcc";
import { exit } from "process";
import { criticalAsync } from "../indexer/indexer-utils";
import { EpochSettings } from "../utils/data-structures/EpochSettings";
import { attesterEntities } from "../utils/database/databaseEntities";
import { DatabaseService } from "../utils/database/DatabaseService";
import { getTimeMilli } from "../utils/helpers/internetTime";
import { catchErrorAndJustLog } from "../utils/helpers/promiseTimeout";
import { MOCK_NULL_WHEN_TESTING, round, sleepms } from "../utils/helpers/utils";
import { AttLogger, logException } from "../utils/logging/logger";
import { Attestation } from "./Attestation";
import { AttestationData } from "./AttestationData";
import { AttestationRound } from "./AttestationRound";
import { AttesterState } from "./AttesterState";
import { BitVoteData } from "./BitVoteData";
import { AttestationClientConfig } from "./configs/AttestationClientConfig";
import { FlareConnection } from "./FlareConnection";
import { GlobalConfigManager } from "./GlobalConfigManager";
import { SourceRouter } from "./source/SourceRouter";
import { AttestationStatus } from "./types/AttestationStatus";

/**
 * Manages attestation rounds (AttestationRound). This includes initiating them, scheduling actions and passing attestations to
 * attestation rounds for further processing.
 */
@Managed()
export class AttestationRoundManager {
  logger: AttLogger;
  sourceRouter: SourceRouter;
  globalConfigManager: GlobalConfigManager;
  dbServiceAttester: DatabaseService;

  attesterState: AttesterState;

  // Round id in which the instance of attestation client process started to run
  private startRoundId: number;
  private _activeRoundId: number | undefined = undefined;

  rounds = new Map<number, AttestationRound>();
  attestationClientConfig: AttestationClientConfig;
  flareConnection: FlareConnection;

  private _initialized = false;

  constructor(config: AttestationClientConfig, logger: AttLogger, flareConnection: FlareConnection, sourceRouter?: SourceRouter) {
    this.attestationClientConfig = config;
    this.logger = logger;
    this.flareConnection = flareConnection;

    this.globalConfigManager = new GlobalConfigManager(this.attestationClientConfig, this.logger);
    this.sourceRouter = sourceRouter ?? new SourceRouter(this.globalConfigManager);
  }

  /**
   * Returns active round id
   */
  public get activeRoundId(): number {
    if (this._activeRoundId === undefined) {
      // this should never happen - the first initialization of activeRoundId should
      // be earlier then the first call to the getter.
      throw new Error("activeRoundId not defined");
    }
    return this._activeRoundId;
  }

  /**
   * Sets active round id.
   */
  public set activeRoundId(value: number) {
    this._activeRoundId = value;
    this.globalConfigManager.activeRoundId = value;
  }

  /**
   * Returns epoch setting object.
   */
  public get epochSettings(): EpochSettings {
    if (!this.flareConnection.epochSettings) {
      // this should never happen. Care should be taken that FlareConnection is initialized before the first use.
      throw new Error("EpochSettings not yet initialized");
    }
    return this.flareConnection.epochSettings;
  }

  /**
   * Returns logging label
   */
  public get label() {
    let label = "";
    if (this.attestationClientConfig.label != "none") {
      label = `[${this.attestationClientConfig.label}]`;
    }
    return label;
  }

  /**
   * Initializes attestation round manager
   */
  public async initialize(): Promise<void> {
    if (this._initialized) {
      throw new Error("AttestationRoundManager can be initialized only once");
    }
    // initialize activeRoundId for the first time, before first load of global configuration, verifer routing configurations
    this.activeRoundId = this.epochSettings.getEpochIdForTime(toBN(getTimeMilli())).toNumber();

    // loads global configurations and initializes them for further refreshes/updates
    await this.globalConfigManager.initialize();

    // database initialization
    this.dbServiceAttester = new DatabaseService(
      this.logger,
      {
        ...this.attestationClientConfig.attesterDatabase,
        entities: attesterEntities(),
        synchronize: true,
      },
      "attester"
    );
    await this.dbServiceAttester.connect();

    // update active round again since waiting for DB connection can take time
    this.activeRoundId = this.epochSettings.getEpochIdForTime(toBN(getTimeMilli())).toNumber();
    this.startRoundId = this.activeRoundId;

    this.attesterState = new AttesterState(this.dbServiceAttester);

    // eslint-disable-next-line
    criticalAsync("startRoundUpdate", async () => {
      await this.startRoundUpdate();
    });

    this._initialized = true;
  }

  /**
   * Additional mechanism to update round manager when there are no requests
   */
  private async startRoundUpdate(): Promise<void> {
    while (true) {
      try {
        const epochId: number = this.epochSettings.getEpochIdForTime(toBN(getTimeMilli())).toNumber();
        this.activeRoundId = epochId;

        const activeRound = this.getRoundOrCreateIt(epochId);
        // initialization is performed only on first call.
        await activeRound.initialize();

        await this.attesterState.saveRoundComment(activeRound, activeRound.attestationsProcessed);
      } catch (error) {
        logException(error, `${this.label} startRoundUpdate`);
      }
      // FUTURE OPTIMIZATION: put this into config. Now ok for 90s voting rounds.
      await sleepms(5000);
    }
  }

  /**
   * A callback for actions on appearance of the new timestamp on blockchain.
   * In particular, t closes the bit voting if the timestamp passes the end
   * of choose phase.
   * Works with the assumption that timestamps come from block progression so
   * they are called in a non-decreasing sequence.
   * @param timestamp
   */
  public onLastFlareNetworkTimestamp(timestamp: number) {
    let bufferNumber = this.epochSettings.getEpochIdForBitVoteTimeSec(timestamp);

    // undefined returned if we are out of bit vote window - we are in the commit part
    if (bufferNumber === undefined) {
      bufferNumber = this.epochSettings.getEpochIdForTimeSec(timestamp);
      let roundId = bufferNumber - 1;
      let round = this.rounds.get(roundId);
      if (round) {
        round.closeBitVoting();
      }
    }
    // FUTURE OPTIMIZATION: for consistency checking reasons we should assert that the sequence of calls
    // has increasing timestamps.
  }

  /**
   * A callback for actions triggerd by new bit vote event.
   * The bitvote event is registered with the correct attestation round object.
   * @param bitVoteData
   */
  public onBitVoteEvent(bitVoteData: BitVoteData) {
    let bufferNumber = this.epochSettings.getEpochIdForBitVoteTimeSec(bitVoteData.timestamp);
    if (bufferNumber !== undefined) {
      let roundId = bufferNumber - 1;
      if (bitVoteData.roundCheck(roundId)) {
        let round = this.rounds.get(roundId);
        if (round) {
          round.registerBitVote(bitVoteData);
        }
      }
    }
  }

  /**
   * Schedules a callback for delayed time
   * @param label
   * @param callback
   * @param after - delayed time in ms
   */
  private schedule(label: string, callback: () => void, after: number) {
    setTimeout(async () => {
      await catchErrorAndJustLog(label, callback);
    }, after);
  }

  /**
   * Initializes round state sampling timer which logs the current state of processing of attestations periodically.
   * @param activeRound
   * @param roundStartTimeMs
   * @param windowDurationMs
   * @param roundCommitStartTimeMs
   */
  private initRoundSampler(activeRound: AttestationRound, roundStartTimeMs: number, windowDurationMs: number, roundCommitStartTimeMs: number) {
    const intervalId = setInterval(
      () => {
        const now = getTimeMilli();
        if (now > roundCommitStartTimeMs) {
          clearInterval(intervalId);
        }
        const eta = (windowDurationMs - (now - roundStartTimeMs)) / 1000;
        if (eta >= 0) {
          this.logger.debug(
            `${this.label}!round: ^Y#${activeRound.roundId}^^ ETA: ${round(eta, 0)} sec ^Wattestation requests: ${activeRound.attestationsProcessed}/${
              activeRound.attestations.length
            }  `
          );
        }
      },
      process.env.TEST_SAMPLING_REQUEST_INTERVAL ? parseInt(process.env.TEST_SAMPLING_REQUEST_INTERVAL, 10) : 5000
    );
  }

  /**
   * Gets the attestation round for a given @param epochId.
   * If the attestation round does not exist, it gets created, initialized and registered.
   * @param roundId
   * @returns attestation round for given @param roundId
   */
  private getRoundOrCreateIt(roundId: number): AttestationRound {
    const now = getTimeMilli();
    let activeRound = this.rounds.get(roundId);

    if (activeRound) {
      return activeRound;
    }

    // obtain global configuration for roundId
    const globalConfig = this.globalConfigManager.getConfig(roundId);

    if (!globalConfig) {
      this.logger.error(`${this.label}${roundId}: critical error, global config for round id not defined`);
      exit(1);
      return MOCK_NULL_WHEN_TESTING;
    }

    // check if verifier router exists for this round id.
    const verifierRouter = this.globalConfigManager.getVerifierRouter(roundId);

    // If no verifier, round cannot be evaluated - critical error.
    // TODO: we should check if it is defined!
    if (!verifierRouter) {
      this.logger.error(`${this.label}${roundId}: critical error, verifier router for round #${roundId} not defined`);
      exit(1);
      return MOCK_NULL_WHEN_TESTING;
    }

    // Update sources to the latest global configs and verifier router configs
    // We are sure at this point, that relevant verifier router exists
    this.sourceRouter.initializeSourcesForRound(roundId);

    // create new round
    activeRound = new AttestationRound(
      roundId,
      globalConfig,
      this.logger,
      this.flareConnection,
      this.attesterState,
      this.sourceRouter,
      this.attestationClientConfig
    );

    this.initRoundSampler(activeRound, activeRound.roundStartTimeMs, activeRound.windowDurationMs, activeRound.roundCommitStartTimeMs);

    // Schedule callbacks
    this.logger.info(`${this.label} ^w^Rcollect phase started^^ round ^Y#${roundId}^^`);

    // trigger start choose phase
    this.schedule(`${this.label} schedule:startChoosePhase`, async () => await activeRound.onChoosePhaseStart(), activeRound.roundChooseStartTimeMs - now);

    // trigger sending bit vote result
    this.schedule(`${this.label} schedule:bitVote`, async () => await activeRound.onSubmitBitVote(), activeRound.roundBitVoteTimeMs - now);

    // trigger start commit phase
    this.schedule(`${this.label} schedule:startCommitPhase`, async () => await activeRound.onCommitPhaseStart(), activeRound.roundCommitStartTimeMs - now);

    // trigger forced closing of bit voting and vote count
    this.schedule(`${this.label} schedule:closeBitVoting`, async () => await activeRound.closeBitVoting(), activeRound.roundForceCloseBitVotingTimeMs - now);

    // trigger start reveal epoch
    this.schedule(`${this.label} schedule:startRevealEpoch`, () => activeRound.onRevealPhaseStart(), activeRound.roundRevealStartTimeMs - now);

    // trigger reveal. Here most of submitAttestation calls to StateConnector happen
    this.schedule(
      `${this.label} schedule:submitAttestation`,
      () => activeRound.onSubmitAttestation(),
      activeRound.roundCompleteTimeMs + this.attestationClientConfig.commitTimeSec * 1000 - now
    );

    // trigger end of reveal epoch, cycle is completed at this point
    this.schedule(`${this.label} schedule:completed`, () => activeRound.onFinalisePhaseStart(), activeRound.roundCompleteTimeMs - now);

    this.rounds.set(roundId, activeRound);
    this.cleanup();

    // link rounds
    const prevRound = this.rounds.get(roundId - 1);
    if (prevRound) {
      activeRound.prevRound = prevRound;
      prevRound.nextRound = activeRound;
    } else {
      // trigger first commit
      this.schedule(
        `${this.label} schedule:firstCommit`,
        () => activeRound!.onFirstCommit(),
        activeRound.roundRevealStartTimeMs + this.attestationClientConfig.commitTimeSec * 1000 - now
      );
    }

    return activeRound;
  }

  /**
   * Accepts the attestation request event.
   * Creates an attestation from attestation data and adds it to the active round
   * @param attestationData
   * @returns
   */
  public async onAttestationRequest(attestationData: AttestationData) {
    const epochId: number = this.epochSettings.getEpochIdForTime(attestationData.timeStamp.mul(toBN(1000))).toNumber();

    this.activeRoundId = this.epochSettings.getEpochIdForTime(toBN(getTimeMilli())).toNumber();

    if (epochId < this.startRoundId) {
      this.logger.debug(`${this.label}epoch too low ^Y#${epochId}^^`);
      return;
    }

    const attestationRound = this.getRoundOrCreateIt(epochId);
    await attestationRound.initialize();

    // create, check and add attestation. If attestation is not ok, status is set to 'invalid'
    const attestation = this.createAttestation(epochId, attestationData);

    // attestation is added to the list, if non-duplicate. Invalid attestations are marked as processed a pointer to the round is added to the attestation
    attestationRound.addAttestation(attestation);

    // update database log for number of attestations
    await this.attesterState.saveRoundComment(attestationRound, attestationRound.attestationsProcessed);
  }

  /**
   * Cleans up old attestation rounds to prevent memory leaks.
   */
  private cleanup() {
    const epochId = this.epochSettings.getCurrentEpochId().toNumber();

    // clear old epochs
    if (this.rounds.has(epochId - 10)) {
      this.rounds.delete(epochId - 10);
    }
  }

  /**
   * Creates attestation from the round and data.
   * If no verifier router exist for the
   * @param roundId
   * @param data
   * @returns
   */
  private createAttestation(roundId: number, data: AttestationData): Attestation {
    const attestation = new Attestation(roundId, data);

    const globalConfig = this.globalConfigManager.getConfig(roundId);
    const verifier = this.globalConfigManager.getVerifierRouter(roundId);
    if (!globalConfig || !verifier) {
      // this should not happen
      attestation.status = AttestationStatus.failed;
      this.logger.error(`${this.label}Assert: both global config and verifier router for round should exist. Critical error`);
      process.exit(1);
    }
    const attestationSupported = globalConfig.sourceAndTypeSupported(data.sourceId, data.type);
    if (!attestationSupported || !verifier.isSupported(data.sourceId, data.type)) {
      this.logger.error(`${this.label}Attestation type for source ${data.sourceId} and type ${data.type} not supported for request: ${data.request}`);
      attestation.status = AttestationStatus.failed;
    }
    return attestation;
  }
}
