import { toBN } from "flare-mcc";
import { ChainManager } from "../chain/ChainManager";
import { DatabaseService } from "../utils/databaseService";
import { EpochSettings } from "../utils/EpochSettings";
import { getTimeMilli } from "../utils/internetTime";
import { AttLogger, getGlobalLogger } from "../utils/logger";
import { Attestation, AttestationStatus } from "./Attestation";
import { AttestationData } from "./AttestationData";
import { AttestationRound } from "./AttestationRound";
import { AttesterClientConfiguration, AttesterCredentials } from "./AttesterClientConfiguration";
import { AttesterWeb3 } from "./AttesterWeb3";
import { AttestationConfigManager } from "./DynamicAttestationConfig";

const cliProgress = require('cli-progress');
export class AttestationRoundManager {
  logger: AttLogger;
  static epochSettings: EpochSettings;
  static chainManager: ChainManager;
  static attestationConfigManager: AttestationConfigManager;
  static dbServiceIndexer: DatabaseService;
  static dbServiceAttester: DatabaseService;

  static activeEpochId: number;

  rounds = new Map<number, AttestationRound>();
  config: AttesterClientConfiguration;
  static credentials: AttesterCredentials;
  attesterWeb3: AttesterWeb3;

  constructor(chainManager: ChainManager, config: AttesterClientConfiguration, credentials: AttesterCredentials, logger: AttLogger, attesterWeb3: AttesterWeb3) {
    this.config = config;
    AttestationRoundManager.credentials=credentials;
    this.logger = logger;
    this.attesterWeb3 = attesterWeb3;

    AttestationRoundManager.epochSettings = new EpochSettings(toBN(config.firstEpochStartTime), toBN(config.roundDurationSec));
    AttestationRoundManager.chainManager = chainManager;
    AttestationRoundManager.attestationConfigManager = new AttestationConfigManager(config, logger);

    AttestationRoundManager.activeEpochId = AttestationRoundManager.epochSettings.getEpochIdForTime(toBN(getTimeMilli())).toNumber();
  }

  async initialize() {
    await AttestationRoundManager.attestationConfigManager.initialize();

    AttestationRoundManager.dbServiceIndexer = new DatabaseService(this.logger, AttestationRoundManager.credentials.indexerDatabase, "indexer");
    await AttestationRoundManager.dbServiceIndexer.waitForDBConnection();

    AttestationRoundManager.dbServiceAttester = new DatabaseService(this.logger, AttestationRoundManager.credentials.attesterDatabase, "attester");
    await AttestationRoundManager.dbServiceAttester.waitForDBConnection();
  }

  async attestate(tx: AttestationData) {
    const time = tx.timeStamp.toNumber();

    const epochId: number = AttestationRoundManager.epochSettings.getEpochIdForTime(tx.timeStamp.mul(toBN(1000))).toNumber();

    AttestationRoundManager.activeEpochId = AttestationRoundManager.epochSettings.getEpochIdForTime(toBN(getTimeMilli())).toNumber();

    // all times are in milliseconds
    const now = getTimeMilli();
    const epochTimeStart = AttestationRoundManager.epochSettings.getRoundIdTimeStartMs(epochId);
    const epochCommitTime: number = epochTimeStart + this.config.roundDurationSec * 1000;
    const epochRevealTime: number = epochCommitTime + this.config.roundDurationSec * 1000;
    const epochCompleteTime: number = epochRevealTime + this.config.roundDurationSec * 1000;

    let activeRound = this.rounds.get(epochId);

    // check if attester epoch already exists - if not - create a new one and assign callbacks
    if (activeRound === undefined) {
      activeRound = new AttestationRound(epochId, this.logger, this.attesterWeb3);

      //let bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
      //bar1.start(this.config.roundDurationSec * 1000, now - epochTimeStart);
      let intervalId = setInterval(() => {
        const now = getTimeMilli();
        if (now > epochCommitTime) {
          clearInterval(intervalId);
          //bar1.stop()
        }
        //bar1.update(now - epochTimeStart);
        getGlobalLogger().debug(`^G${90 - (now - epochTimeStart) / 1000} ETA`);
      }, 5000)


      // setup commit, reveal and completed callbacks
      this.logger.warning(`round ${epochId} collect epoch [0]`);

      // trigger start commit epoch
      setTimeout(() => {
        activeRound!.startCommitEpoch();
      }, epochCommitTime - now);

      // trigger start reveal epoch
      setTimeout(() => {
        activeRound!.startRevealEpoch();
      }, epochRevealTime - now);

      // trigger end of commit time (if attestations were not done until here then the epoch will not be submitted)
      setTimeout(() => {
        activeRound!.commitLimit();
      }, epochRevealTime - now - this.config.commitTime * 1000);

      // trigger reveal
      setTimeout(() => {
        activeRound!.reveal();
      }, epochRevealTime - now + this.config.revealTime * 1000);

      // trigger end of reveal epoch, cycle is completed at this point
      setTimeout(() => {
        activeRound!.completed();
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
          activeRound!.firstCommit();
        }, epochCommitTime - now + this.config.revealTime * 1000);
      }
    }

    // create, check and add attestation
    const attestation = await this.createAttestation(activeRound, tx);

    if (attestation === undefined) {
      return;
    }

    activeRound.addAttestation(attestation);
  }

  cleanup() {
    const epochId = AttestationRoundManager.epochSettings.getCurrentEpochId().toNumber();

    // clear old epochs
    if (this.rounds.has(epochId - 10)) {
      this.rounds.delete(epochId - 10);
    }
  }

  createSimulationAttestation(round: AttestationRound, data: AttestationData): Attestation {
    return new Attestation(round, data, (attestation: Attestation) => {
      // set status as valid
      attestation.status = AttestationStatus.valid;
      attestation.verificationData = null;

      // callback to flag attestation processed
      attestation.onProcessed!(attestation);
    });
  }

  async createAttestation(round: AttestationRound, data: AttestationData): Promise<Attestation | undefined> {
    // create attestation depending on attestation type

    // Simulation
    if (this.config.simulation) {
      return this.createSimulationAttestation(round, data);
    }

    return new Attestation(round, data, (attestation: Attestation) => {
      // chain node validation
      AttestationRoundManager.chainManager.validateTransaction(data.sourceId, attestation);
    });

    // // processing
    // switch (data.type) {
    //   case AttestationType.Payment: {
    //     return new Attestation(round, data, (attestation: Attestation) => {
    //       // chain node validation
    //       AttestationRoundManager.chainManager.validateTransaction(data.source, attestation);
    //     });
    //   }
    //   // case AttestationType.BalanceDecreasingPayment:
    //   //   // todo: implement balance change check
    //   //   this.logger.error(`  ! '${data.type}': unimplemented AttestationType BalanceDecreasingProof`);
    //   //   return undefined;
    //   default: {
    //     this.logger.error(`  ! '${data.type}': undefined AttestationType (epoch #${round.roundId})`);
    //     return undefined;
    //   }
    // }
  }
}
