import { Logger } from "winston";
import { Attestation } from "../attester/Attestation";
import { AttestationData } from "../attester/AttestationData";
import { ChainType } from "../MCC/types";
import { ChainNode } from "./ChainNode";

export class ChainManager {
  nodes: Map<ChainType, ChainNode> = new Map<ChainType, ChainNode>();

  logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  validateTransaction(chain: ChainType, epochId: number, tx: AttestationData): Attestation | undefined {
    if (!this.nodes.has(chain)) {
      this.logger.error(`  ! '${chain}: undefined chain'`);
      //
      return undefined;
    }

    return this.nodes.get(chain)!.validate(epochId, tx);
  }
}
