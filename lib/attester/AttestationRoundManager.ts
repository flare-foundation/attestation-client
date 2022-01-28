import BN from "bn.js";
import { ChainType, toBN } from "flare-mcc";
import { ChainManager } from "../chain/ChainManager";
import { EpochSettings } from "../utils/EpochSettings";
import { getTimeMilli } from "../utils/internetTime";
import { AttLogger } from "../utils/logger";
import { partBNbe } from "../utils/utils";
import { AttestationType, ATT_BITS, CHAIN_ID_BITS } from "../verification/attestation-types";
import { Attestation } from "./Attestation";
import { AttestationData } from "./AttestationData";
import { AttestationRound } from "./AttestationRound";
import { AttesterClientConfiguration as AttesterClientConfiguration } from "./AttesterClientConfiguration";
import { AttesterWeb3 } from "./AttesterWeb3";

export class AttestationRoundManager {
  logger: AttLogger;
  static epochSettings: EpochSettings;
  static chainManager: ChainManager;
  rounds = new Map<number, AttestationRound>();
  conf!: AttesterClientConfiguration;
  attesterWeb3: AttesterWeb3;

  constructor(chainManager: ChainManager, conf: AttesterClientConfiguration, logger: AttLogger, attesterWeb3: AttesterWeb3) {
    this.conf = conf;
    this.logger = logger;
    this.attesterWeb3 = attesterWeb3;

    AttestationRoundManager.epochSettings = new EpochSettings(toBN(conf.firstEpochStartTime), toBN(conf.epochPeriod));
    AttestationRoundManager.chainManager = chainManager;
  }

  async attestate(tx: AttestationData) {
    const time = tx.timeStamp.toNumber();

    const epochId: number = AttestationRoundManager.epochSettings.getEpochIdForTime(tx.timeStamp.mul(toBN(1000))).toNumber();

    // all times are in milliseconds
    const now = getTimeMilli();
    const epochTimeStart = AttestationRoundManager.epochSettings.getEpochIdTimeStart(epochId);
    const epochCommitTime: number = epochTimeStart + this.conf.epochPeriod * 1000 + 1;
    const epochRevealTime: number = epochCommitTime + this.conf.epochPeriod * 1000 + 2;
    const epochCompleteTime: number = epochRevealTime + this.conf.epochPeriod * 1000 + 3;

    let activeRound = this.rounds.get(epochId);

    // check if attester epoch already exists - if not - create a new one and assign callbacks
    if (activeRound === undefined) {
      activeRound = new AttestationRound(epochId, this.logger, this.attesterWeb3);

      // setup commit, reveal and completed callbacks
      this.logger.warning(` * AttestEpoch ${epochId} collect epoch [0]`);

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
      }, epochRevealTime - now - this.conf.commitTime * 1000);

      // trigger reveal
      setTimeout(() => {
        activeRound!.reveal();
      }, epochRevealTime - now + this.conf.revealTime * 1000);

      // trigger end of reveal epoch, cycle is completed at this point
      setTimeout(() => {
        activeRound!.completed();
      }, epochCompleteTime - now);

      this.rounds.set(epochId, activeRound);

      this.cleanup();

      activeRound.commitEndTime = epochRevealTime - this.conf.commitTime * 1000;
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

  async createAttestation(activeRound: AttestationRound, tx: AttestationData): Promise<Attestation | undefined> {
    const transaction = new Attestation();
    transaction.attesterEpoch = activeRound;
    transaction.epochId = activeRound.epochId;
    //transaction.chainNode = this;
    transaction.data = tx;

    // create attestation depending on type
    switch (tx.type) {
      case AttestationType.LabeledToOnePayment: {
        const chainType: BN = partBNbe(tx.instructions, ATT_BITS, CHAIN_ID_BITS);

        // direct chain validation
        transaction.sourceHandler = activeRound.getSourceHandler(chainType.toNumber(), (attestation) => {
          AttestationRoundManager.chainManager.validateTransaction(chainType.toNumber() as ChainType, attestation);
        });

        break;
      }
      case AttestationType.BalanceDecreasingPayment:
        // todo: implement balance change check
        this.logger.error(`  ! '${tx.type}': unimplemented AttestationType (epoch #${activeRound.epochId})`);
        return undefined;
      default: {
        this.logger.error(`  ! '${tx.type}': undefined AttestationType (epoch #${activeRound.epochId})`);
        return undefined;
      }
    }
    return transaction;
  }
}
