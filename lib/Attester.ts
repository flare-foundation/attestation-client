import BN from "bn.js";
import { Logger } from "winston";
import { Attestation } from "./Attestation";
import { AttestationData, AttestationType } from "./AttestationData";
import { AttesterEpoch } from "./AttesterEpoch";
import { AttesterWeb3 } from "./AttesterWeb3";
import { ChainManager } from "./ChainManager";
import { DataProviderConfiguration as AttesterClientConfiguration } from "./DataProviderConfiguration";
import { EpochSettings } from "./EpochSettings";
import { getTime } from "./internetTime";
import { ChainType } from "./MCC/MCClientSettings";
import { partBNbe, toBN } from "./utils";

export class Test {}

export class Attester {
  logger: Logger;
  epochSettings: EpochSettings;
  chainManager!: ChainManager;
  epoch: Map<number, AttesterEpoch> = new Map<number, AttesterEpoch>();
  conf!: AttesterClientConfiguration;
  attesterWeb3: AttesterWeb3;

  constructor(chainManager: ChainManager, conf: AttesterClientConfiguration, logger: Logger, attesterWeb3: AttesterWeb3) {
    this.chainManager = chainManager;
    this.conf = conf;
    this.logger = logger;
    this.epochSettings = new EpochSettings(toBN(conf.firstEpochStartTime), toBN(conf.epochPeriod));
    this.attesterWeb3 = attesterWeb3;
  }

  async attestate(tx: AttestationData) {
    const time = tx.timeStamp.toNumber();

    const epochId: number = this.epochSettings.getEpochIdForTime(tx.timeStamp).toNumber();

    let activeEpoch = this.epoch.get(epochId);

    // check if attester epoch already exists - if not - create a new one and assign callbacks
    if (activeEpoch === undefined) {
      activeEpoch = new AttesterEpoch(epochId, this.logger, this.attesterWeb3);

      this.epoch.set(epochId, activeEpoch);

      // setup commit, reveal and completed callbacks
      const now = getTime();
      const epochTimeEnd = this.epochSettings.getEpochTimeEnd().toNumber();
      const epochCommitTime: number = epochTimeEnd + this.conf.epochPeriod - this.conf.commitTime;
      const epochRevealTime: number = epochTimeEnd + this.conf.epochPeriod + this.conf.revealTime;
      const epochCompleteTime: number = epochTimeEnd + this.conf.epochPeriod * 2;

      setTimeout(() => {
        activeEpoch!.startCommit();
      }, (epochCommitTime - now) * 1000);

      setTimeout(() => {
        activeEpoch!.startReveal();
      }, (epochRevealTime - now) * 1000);

      setTimeout(() => {
        activeEpoch!.completed();
      }, (epochCompleteTime - now) * 1000);
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
