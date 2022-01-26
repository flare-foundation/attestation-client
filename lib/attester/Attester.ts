import BN from "bn.js";
import { Logger } from "winston";
import { ChainManager } from "../chain/ChainManager";
import { ChainType } from "../MCC/types";
import { toBN } from "../MCC/utils";
import { EpochSettings } from "../utils/EpochSettings";
import { getTimeMilli } from "../utils/internetTime";
import { AttLogger } from "../utils/logger";
import { partBNbe } from "../utils/utils";
import { AttestationType, ATT_BITS, CHAIN_ID_BITS } from "../verification/attestation-types";
import { Attestation } from "./Attestation";
import { AttestationData } from "./AttestationData";
import { AttesterClientConfiguration as AttesterClientConfiguration } from "./AttesterClientConfiguration";
import { AttesterEpoch } from "./AttesterEpoch";
import { AttesterWeb3 } from "./AttesterWeb3";

export class Test {}

export class Attester {
  logger: AttLogger;
  static epochSettings: EpochSettings;
  chainManager!: ChainManager;
  epoch: Map<number, AttesterEpoch> = new Map<number, AttesterEpoch>();
  conf!: AttesterClientConfiguration;
  attesterWeb3: AttesterWeb3;

  constructor(chainManager: ChainManager, conf: AttesterClientConfiguration, logger: AttLogger, attesterWeb3: AttesterWeb3) {
    this.chainManager = chainManager;
    this.conf = conf;
    this.logger = logger;
    Attester.epochSettings = new EpochSettings(toBN(conf.firstEpochStartTime), toBN(conf.epochPeriod));
    this.attesterWeb3 = attesterWeb3;
  }

  async attestate(tx: AttestationData) {
    const time = tx.timeStamp.toNumber();

    const epochId: number = Attester.epochSettings.getEpochIdForTime(tx.timeStamp.mul(toBN(1000))).toNumber();

    // all times are in milliseconds
    const now = getTimeMilli();
    const epochTimeStart = Attester.epochSettings.getEpochIdTimeStart(epochId);
    const epochCommitTime: number = epochTimeStart + this.conf.epochPeriod * 1000 + 1;
    const epochRevealTime: number = epochCommitTime + this.conf.epochPeriod * 1000 + 2;
    const epochCompleteTime: number = epochRevealTime + this.conf.epochPeriod * 1000 + 3;

    // if (now > epochCommitTime) {
    //   this.logger.error(` ! attestation timestamp too late ${tx.blockNumber}`);
    //   return;
    // }

    let activeEpoch = this.epoch.get(epochId);

    // check if attester epoch already exists - if not - create a new one and assign callbacks
    if (activeEpoch === undefined) {
      activeEpoch = new AttesterEpoch(epochId, this.logger, this.attesterWeb3);

      // setup commit, reveal and completed callbacks
      this.logger.warning(` * AttestEpoch ${epochId} collect epoch [0]`);

      // trigger start commit epoch
      setTimeout(() => {
        activeEpoch!.startCommitEpoch();
      }, epochCommitTime - now);

      // trigger start reveal epoch
      setTimeout(() => {
        activeEpoch!.startRevealEpoch();
      }, epochRevealTime - now);

      // trigger end of commit time (if attestations were not done until here then the epoch will not be submitted)
      setTimeout(() => {
        activeEpoch!.commitLimit();
      }, epochRevealTime - now - this.conf.commitTime * 1000);

      // trigger reveal
      setTimeout(() => {
        activeEpoch!.reveal();
      }, epochRevealTime - now + this.conf.revealTime * 1000);

      // trigger end of reveal epoch, cycle is completed at this point
      setTimeout(() => {
        activeEpoch!.completed();
      }, epochCompleteTime - now);

      this.epoch.set(epochId, activeEpoch);

      this.cleanup();

      activeEpoch.commitEndTime = epochRevealTime - this.conf.commitTime * 1000;
    }

    // create, check and add attestation
    const attestation = await this.createAttestation(activeEpoch, tx);

    if (attestation === undefined) {
      return;
    }

    activeEpoch.addAttestation(attestation);
  }

  cleanup() {
    const epochId = Attester.epochSettings.getCurrentEpochId().toNumber();

    // clear old epochs
    if (this.epoch.has(epochId - 10)) {
      this.epoch.delete(epochId - 10);
    }
  }

  async createAttestation(activeEpoch: AttesterEpoch, tx: AttestationData): Promise<Attestation | undefined> {
    // create attestation depending on type
    switch (tx.type) {
      case AttestationType.FassetPaymentProof: {
        const chainType: BN = partBNbe(tx.instructions, ATT_BITS, CHAIN_ID_BITS);

        return await this.chainManager.validateTransaction(chainType.toNumber() as ChainType, activeEpoch, tx);
      }
      case AttestationType.BalanceDecreasingProof:
        // todo: implement balance change check
        return undefined;
      default: {
        this.logger.error(`  ! '${tx.type}': undefined AttestationType (epoch #${activeEpoch.epochId})`);
        return undefined;
      }
    }
  }
}
