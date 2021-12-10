import { Logger } from "winston";
import { ChainNode } from "./ChainNode";
import { ChainTransaction } from "./ChainTransaction";
import { ChainType } from "./MCC/MCClientSettings";

export class ChainManager {
  nodes: Map<ChainType, ChainNode> = new Map<ChainType, ChainNode>();

  logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  validateTransaction(chain: ChainType, epoch: number, id: number, transactionHash: string, metadata: any): ChainTransaction | undefined {
    if (!this.nodes.has(chain)) {
      this.logger.error(`  ! '${chain}: undefined chain'`);
      //
      return undefined;
    }

    return this.nodes.get(chain)!.validate(epoch, id, transactionHash, metadata);
  }
}
