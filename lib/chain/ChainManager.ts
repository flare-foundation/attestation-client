import { ChainType } from "flare-mcc";
import { Logger } from "winston";
import { Attestation } from "../attester/Attestation";
import { ChainNode } from "./ChainNode";

export class ChainManager {
  nodes = new Map<ChainType, ChainNode>();

  logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  addNode(chain: ChainType, node: ChainNode) {
    this.nodes.set(chain, node);
  }

  validateTransaction(chain: ChainType, transaction: Attestation) {
    const node = this.nodes.get(chain);

    if (!node) {
      this.logger.error(`  ! '${chain}: undefined chain'`);
      //
      return undefined;
    }

    return node.validate(transaction);
  }
}
