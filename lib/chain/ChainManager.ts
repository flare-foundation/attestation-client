import { Managed } from "@flarenetwork/mcc";
import { Attestation } from "../attester/Attestation";
import { AttLogger } from "../utils/logger";
import { SourceId } from "../verification/sources/sources";
import { ChainNode } from "./ChainNode";

/**
 * Class that stores the assignments of a ChainNode to each chain type
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
   * Starts attestation validation for given @param sourceId
   * @param sourceId 
   * @param attestation 
   * @returns 
   */
  validateAttestation(sourceId: SourceId, attestation: Attestation) {
    const node = this.nodes.get(sourceId);

    if (!node) {
      this.logger.error(`  ! '${sourceId}: undefined chain'`);
      //
      return undefined;
    }

    return node.validate(attestation);
  }
}
