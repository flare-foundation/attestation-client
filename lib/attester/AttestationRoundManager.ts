import { Managed, toBN } from "@flarenetwork/mcc";
import { ChainManager } from "../chain/ChainManager";
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
import { AttestationConfigManager, SourceHandlerConfig } from "./DynamicAttestationConfig";
/**
 * Manages a specific attestation round
 */
@Managed()
export class AttestationRoundManager {
  logger: AttLogger;
  static epochSettings: EpochSettings;
  static chainManager: ChainManager;
  static attestationConfigManager: AttestationConfigManager;
  static dbServiceIndexer: DatabaseService;
  static dbServiceAttester: DatabaseService;

  static state = new AttesterState();

  static startEpochId: number;
  static activeEpochId: number;

  rounds = new Map<number, AttestationRound>();
  static config: AttesterClientConfiguration;
  static credentials: AttesterCredentials;
  static attesterWeb3: AttesterWeb3;

  constructor(
    chainManager: ChainManager,
    config: AttesterClientConfiguration,
    credentials: AttesterCredentials,
    logger: AttLogger,
    attesterWeb3: AttesterWeb3
  ) {
    AttestationRoundManager.config = config;
    AttestationRoundManager.credentials = credentials;
    this.logger = logger;
    AttestationRoundManager.attesterWeb3 = attesterWeb3;

    AttestationRoundManager.epochSettings = new EpochSettings(toBN(config.firstEpochStartTime), toBN(config.roundDurationSec));
    AttestationRoundManager.chainManager = chainManager;
    AttestationRoundManager.attestationConfigManager = new AttestationConfigManager(config, logger);

    AttestationRoundManager.activeEpochId = AttestationRoundManager.epochSettings.getEpochIdForTime(toBN(getTimeMilli())).toNumber();
  }

  /**
   * Initializes attestation round manager
   */
  async initialize(): Promise<void> {
    await AttestationRoundManager.attestationConfigManager.initialize();

    AttestationRoundManager.dbServiceIndexer = new DatabaseService(this.logger, AttestationRoundManager.credentials.indexerDatabase, "indexer");
    await AttestationRoundManager.dbServiceIndexer.waitForDBConnection();

    AttestationRoundManager.dbServiceAttester = new DatabaseService(this.logger, AttestationRoundManager.credentials.attesterDatabase, "attester");
    await AttestationRoundManager.dbServiceAttester.waitForDBConnection();

    // update active round again since waitin for DB connection can take time
    AttestationRoundManager.activeEpochId = AttestationRoundManager.epochSettings.getEpochIdForTime(toBN(getTimeMilli())).toNumber();
    AttestationRoundManager.startEpochId = AttestationRoundManager.activeEpochId;

    // eslint-disable-next-line    
    this.startRoundUpdate();
  }

  /**
   * Additional mechanism to update round manager when there are no requests
   */
  async startRoundUpdate(): Promise<void> {
    while (true) {
      try {
        const epochId: number = AttestationRoundManager.epochSettings.getEpochIdForTime(toBN(getTimeMilli())).toNumber();
        AttestationRoundManager.activeEpochId = epochId;

        const activeRound = this.getRoundOrCreateIt(epochId);

        await AttestationRoundManager.state.saveRoundComment(activeRound, activeRound.attestationsProcessed);
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
  static getSourceHandlerConfig(name: string): SourceHandlerConfig {
    return AttestationRoundManager.attestationConfigManager.getSourceHandlerConfig(toSourceId(name), AttestationRoundManager.activeEpochId);
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
    const epochTimeStart = AttestationRoundManager.epochSettings.getRoundIdTimeStartMs(epochId);
    const epochCommitTime: number = epochTimeStart + AttestationRoundManager.config.roundDurationSec * 1000;
    const epochRevealTime: number = epochCommitTime + AttestationRoundManager.config.roundDurationSec * 1000;
    const epochCompleteTime: number = epochRevealTime + AttestationRoundManager.config.roundDurationSec * 1000;

    let activeRound = this.rounds.get(epochId);

    // check if attester epoch already exists - if not - create a new one and assign callbacks
    if (activeRound === undefined) {
      activeRound = new AttestationRound(epochId, this.logger, AttestationRoundManager.attesterWeb3);

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
      }, epochRevealTime - AttestationRoundManager.config.commitTime * 1000 - 1000 - now);

      // trigger reveal
      setTimeout(() => {
        safeCatch(`setTimeout:reveal`, () => activeRound!.reveal());
      }, epochCompleteTime - AttestationRoundManager.config.commitTime * 1000 - now);

      // trigger end of reveal epoch, cycle is completed at this point
      setTimeout(() => {
        safeCatch(`setTimeout:completed`, () => activeRound!.completed());
      }, epochCompleteTime - now);

      this.rounds.set(epochId, activeRound);

      this.cleanup();

      activeRound.commitEndTime = epochRevealTime - AttestationRoundManager.config.commitTime * 1000;

      // link rounds
      const prevRound = this.rounds.get(epochId - 1);
      if (prevRound) {
        activeRound.prevRound = prevRound;
        prevRound.nextRound = activeRound;
      } else {
        // trigger first commit
        setTimeout(() => {
          safeCatch(`setTimeout:firstCommit`, () => activeRound!.firstCommit());
        }, epochRevealTime - AttestationRoundManager.config.commitTime * 1000 - now);
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
    const epochId: number = AttestationRoundManager.epochSettings.getEpochIdForTime(attestationData.timeStamp.mul(toBN(1000))).toNumber();

    AttestationRoundManager.activeEpochId = AttestationRoundManager.epochSettings.getEpochIdForTime(toBN(getTimeMilli())).toNumber();

    if (epochId < AttestationRoundManager.startEpochId) {
      this.logger.debug(`epoch too low ^Y#${epochId}^^`);
      return;
    }

    const activeRound = this.getRoundOrCreateIt(epochId);

    // create, check and add attestation
    const attestation = await this.createAttestation(activeRound, attestationData);

    if (attestation === undefined) {
      return;
    }

    activeRound.addAttestation(attestation);

    await AttestationRoundManager.state.saveRoundComment(activeRound, activeRound.attestationsProcessed);
  }

  cleanup() {
    const epochId = AttestationRoundManager.epochSettings.getCurrentEpochId().toNumber();

    // clear old epochs
    if (this.rounds.has(epochId - 10)) {
      this.rounds.delete(epochId - 10);
    }
  }

  async createAttestation(round: AttestationRound, data: AttestationData): Promise<Attestation | undefined> {
    // create attestation depending on attestation type
    return new Attestation(round, data, (attestation: Attestation) => {
      // chain node validation
      AttestationRoundManager.chainManager.validateAttestation(data.sourceId, attestation);
    });
  }
}
