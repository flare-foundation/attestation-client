import BN from "bn.js";
import { Logger } from "winston";
import { Attestation } from "./Attestation";
import { AttestationData, AttestationType } from "./AttestationData";
import { AttesterEpoch } from "./AttesterEpoch";
import { ChainManager } from "./ChainManager";
import { DataProviderConfiguration as AttesterClientConfiguration } from "./DataProviderConfiguration";
import { EpochSettings } from "./EpochSettings";
import { getTime } from "./internetTime";
import { ChainType } from "./MCC/MCClientSettings";
import { partBN, partBNbe, toBN } from "./utils";

export class Attester {
  logger: Logger;
  epochSettings: EpochSettings;
  chainManager!: ChainManager;
  epoch: Map<number, AttesterEpoch> = new Map<number, AttesterEpoch>();
  conf!: AttesterClientConfiguration;

  constructor(chainManager: ChainManager, conf: AttesterClientConfiguration, logger: Logger) {
    this.chainManager = chainManager;
    this.conf = conf;
    this.logger = logger;
    this.epochSettings = new EpochSettings(toBN(conf.firstEpochStartTime), toBN(conf.epochPeriod));
  }

  async attestate(tx: AttestationData) {
    const epochId: number = this.epochSettings.getEpochIdForTime(tx.timeStamp).toNumber();

    let activeEpoch = this.epoch.get(epochId);

    // check if attester epoch already exists - if not - create a new one and assign callbacks
    if (activeEpoch === undefined) {
      activeEpoch = new AttesterEpoch(epochId, this.logger);

      this.epoch.set(epochId, activeEpoch);

      // setup commit, reveal and completed callbacks
      const now = getTime();
      const epochCommitTime: number = this.epochSettings.getEpochTimeEnd().toNumber() + this.conf.epochPeriod - this.conf.commitTime;
      const epochRevealTime: number = this.epochSettings.getEpochTimeEnd().toNumber() + this.conf.epochPeriod + this.conf.revealTime;
      const epochCompleteTime: number = this.epochSettings.getEpochTimeEnd().toNumber() + this.conf.revealTime * 2;

      setTimeout(() => {
        activeEpoch!.startCommit();
      }, epochCommitTime - now);

      setTimeout(() => {
        activeEpoch!.startReveal();
      }, epochRevealTime - now);

      setTimeout(() => {
        activeEpoch!.completed();
      }, epochCompleteTime - now);
    }

    // todo: clean up old attestations (minor memory leak)

    // create, check and add attestation
    const attestation = await this.createAttestation(epochId, tx);

    if (attestation === undefined) {
      return;
    }

    activeEpoch.addAttestation(attestation);
  }

  async createAttestation(epochId: number, tx: AttestationData): Promise<Attestation | undefined> {
    // create attestation depending on type
    switch (tx.type) {
      case AttestationType.FassetPaymentProof: {
        const chainType: BN = partBNbe(tx.instructions, 16, 32);

        return await this.chainManager.validateTransaction(chainType.toNumber() as ChainType, epochId, tx);
      }
      case AttestationType.BalanceDecreasingProof:
        return undefined; // ???
      default: {
        this.logger.error(`  ! #${tx.type} undefined AttestationType epoch: #${epochId})`);
        return undefined;
      }
    }
  }
}
