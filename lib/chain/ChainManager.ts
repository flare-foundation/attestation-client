import { Logger } from "winston";
import { Attestation } from "../attester/Attestation";
import { ChainType } from "../MCC/types";
import { ChainNode } from "./ChainNode";

export class ChainManager {
  nodes: Map<ChainType, ChainNode> = new Map<ChainType, ChainNode>();

  logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  validateTransaction(chain: ChainType, transaction: Attestation) {
    if (!this.nodes.has(chain)) {
      this.logger.error(`  ! '${chain}: undefined chain'`);
      //
      return undefined;
    }

    // todo: select least used node for this chain
    return this.nodes.get(chain)!.validate(transaction);
  }
}
