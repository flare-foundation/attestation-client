import { ChainType } from "flare-mcc";
import { Logger } from "winston";
import { Attestation } from "../attester/Attestation";
import { ChainNode } from "./ChainNode";

export class ChainManager {
  nodes = new Map<ChainType, Array<ChainNode>>();

  logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  addNode(chain: ChainType, node: ChainNode) {
    let chainNodes = this.nodes.get(chain);

    if (!chainNodes) {
      chainNodes = new Array<ChainNode>();
      this.nodes.set(chain, chainNodes);
    }

    chainNodes.push(node);
  }

  validateTransaction(chain: ChainType, transaction: Attestation) {
    const nodes = this.nodes.get(chain);

    if (!nodes) {
      this.logger.error(`  ! '${chain}: undefined chain'`);
      //
      return undefined;
    }

    if (nodes.length == 1) {
      return nodes[0].validate(transaction);
    } else {
      // find node with least load
      let bestNode = nodes[0];
      for (let a = 1; a < nodes.length; a++) {
        if (bestNode.getLoad() > nodes[a].getLoad()) {
          bestNode = nodes[a];
        }
      }

      return bestNode.validate(transaction);
    }
  }
}
