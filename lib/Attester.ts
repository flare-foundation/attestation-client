import { BigNumber } from "ethers";
import { Logger } from "winston";
import { AttesterEpoch } from "./AttesterEpoch";
import { ChainManager } from "./ChainManager";
import { ChainTransaction } from "./ChainTransaction";
import { DataProviderConfiguration } from "./DataProviderConfiguration";
import { DataTransaction } from "./DataTransaction";
import { EpochSettings } from "./EpochSettings";
import { getTime } from "./internetTime";
import { ChainType } from "./MCC/MCClientSettings";

export class Attester {
  logger: Logger;
  epochSettings!: EpochSettings;
  chainManager!: ChainManager;
  epoch: Map<number, AttesterEpoch> = new Map<number, AttesterEpoch>();
  conf!: DataProviderConfiguration;

  constructor(chainManager: ChainManager, conf: DataProviderConfiguration, logger: Logger) {
    this.chainManager = chainManager;
    this.conf = conf;
    this.logger = logger;
  }

  async validateTransaction(chainType: ChainType, timeStamp: BigNumber, tx: DataTransaction) {
    const epochId: number = this.epochSettings.getEpochIdForTime(timeStamp).toNumber();

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

    // todo: clean up old data

    // create transaction and add it into attester epoch
    const transaction = await this.chainManager.validateTransaction(chainType, tx);

    if (transaction === undefined) {
      return;
    }

    transaction.onProcessed = (tx) => {
      this.epoch.get(tx.epochId)!.processed(tx);
    };

    activeEpoch.transactions.push(transaction);
  }
}
