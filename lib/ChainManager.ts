import { BigNumber } from "ethers";
import { Logger } from "winston";
import { ChainNode } from "./ChainNode";
import { ChainTransaction } from "./ChainTransaction";
import { DataTransaction } from "./DataTransaction";
import { ChainType } from "./MCC/MCClientSettings";

export class ChainManager {
  nodes: Map<ChainType, ChainNode> = new Map<ChainType, ChainNode>();

  logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  validateTransaction(chain: ChainType, epochId: number, tx: DataTransaction): ChainTransaction | undefined {
    if (!this.nodes.has(chain)) {
      this.logger.error(`  ! '${chain}: undefined chain'`);
      //
      return undefined;
    }

    return this.nodes.get(chain)!.validate(epochId, tx);
  }
}
