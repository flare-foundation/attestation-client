import { AttesterEpoch } from "./AttesterEpoch";
import { ChainManager } from "./ChainManager";
import { DataProviderConfiguration } from "./DataProviderConfiguration";
import { EpochSettings } from "./EpochSettings";
import { getTime } from "./internetTime";
import { ChainType } from "./MCC/MCClientSettings";

export class Attester {
  epochSettings!: EpochSettings;
  chainManager!: ChainManager;
  epoch: Map<number, AttesterEpoch> = new Map<number, AttesterEpoch>();
  conf!: DataProviderConfiguration;

  constructor(chainManager: ChainManager, conf: DataProviderConfiguration) {
    this.chainManager = chainManager;
    this.conf = conf;
  }

  async validateTransaction(chain: ChainType, epoch: number, timestamp: number, id: number, transactionHash: string, metadata: any) {
    const epochId: number = this.epochSettings.getEpochIdForTime(timestamp).toNumber();

    let activeEpoch = this.epoch.get(epochId);

    if (activeEpoch === undefined) {
      activeEpoch = new AttesterEpoch();
      activeEpoch.status = "collect";
      activeEpoch.epochId = epochId;

      this.epoch.set(epochId, activeEpoch);

      // setup commit and reveal  E1,E2,E3
      // todo: commit should be triggered when ALL transactions are validate - if not all are validated skip this epoch
      const now = getTime();
      const epochCommitTime: number = this.epochSettings.getEpochTimeEnd().toNumber() + this.conf.epochPeriod - this.conf.commitTime;
      const epochRevealTime: number = this.epochSettings.getEpochTimeEnd().toNumber() + this.conf.epochPeriod + this.conf.revealTime;

      setTimeout(() => {
        activeEpoch!.checkCommit();
      }, epochCommitTime - now);

      setTimeout(() => {
        activeEpoch!.reveal();
      }, epochRevealTime - now);
    }

    const transaction = await this.chainManager.validateTransaction(chain, epoch, id, transactionHash, metadata);

    if (transaction === undefined) {
      // toto: report error
      return;
    }

    activeEpoch.transactions.set(id, transaction!);
  }
}
