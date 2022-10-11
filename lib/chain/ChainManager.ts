import { Managed } from "@flarenetwork/mcc";
import { Attestation } from "../attester/Attestation";
import { AttLogger } from "../utils/logger";
import { SourceId } from "../verification/sources/sources";
import { ChainNode } from "./ChainNode";

/**
 * Class that stores the assignation of a ChainNode to each chain type
 */
@Managed()
export class ChainManager {
  nodes = new Map<SourceId, ChainNode>();

  logger: AttLogger;

  constructor(logger: AttLogger) {
    this.logger = logger;
  }

  /**
   * Assign @param node to @param sourceId
   */
  addNode(sourceId: SourceId, node: ChainNode) {
    this.nodes.set(sourceId, node);
  }

  /**
   * ??Initalizes?? the validation of the attestation
   * @param sourceId
   * @param attestation
   * @returns
   */
  validateTransaction(sourceId: SourceId, attestation: Attestation): void | undefined {
    const node = this.nodes.get(sourceId);

    if (!node) {
      this.logger.error(`  ! '${sourceId}: undefined chain'`);
      //
      return undefined;
    }
    node.validate(attestation);
    // return node.validate(attestation); //This returns void!!!!!
  }
}
