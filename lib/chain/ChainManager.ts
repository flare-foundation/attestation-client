import { Managed } from "@flarenetwork/mcc";
import { Attestation } from "../attester/Attestation";
import { AttLogger } from "../utils/logger";
import { SourceId } from "../verification/sources/sources";
import { ChainNode } from "./ChainNode";

@Managed()
export class ChainManager {
  nodes = new Map<SourceId, ChainNode>();

  logger: AttLogger;

  constructor(logger: AttLogger) {
    this.logger = logger;
  }

  addNode(sourceId: SourceId, node: ChainNode) {
    this.nodes.set(sourceId, node);
  }

  validateTransaction(sourceId: SourceId, transaction: Attestation) {
    const node = this.nodes.get(sourceId);

    if (!node) {
      this.logger.error(`  ! '${sourceId}: undefined chain'`);
      //
      return undefined;
    }

    return node.validate(transaction);
  }
}
