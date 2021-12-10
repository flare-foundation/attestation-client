import { Logger } from "winston";
import { ChainNode } from "./ChainNode";
import { ChainTransaction } from "./ChainTransaction";
import { ChainType } from "./MCC/MCClientSettings";
import { sleepms } from "./Sleep";

export class ChainManager {
  nodes: Map<ChainType, ChainNode> = new Map<ChainType, ChainNode>();

  logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  validateTransaction(chain: ChainType, epoch: number, id: number, transactionHash: string, metadata: any) {
    if (!this.nodes.has(chain)) {
      this.logger.error(`  ! '${chain}: undefined chain'`);
      //
      return;
    }

    this.nodes.get(chain)!.validateTransaction(epoch, id, transactionHash, metadata);
  }

  async startProcessing() {
    while (true) {
      for (const chain of this.nodes.values()) {
        chain.update();
      }

      await sleepms(250);
    }
  }
}
