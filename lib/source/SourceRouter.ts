import { Managed } from "@flarenetwork/mcc";
import { Attestation } from "../attester/Attestation";
import { AttLogger } from "../utils/logger";
import { SourceId } from "../verification/sources/sources";
import { SourceManager } from "./SourceManager";

/**
 * Class that stores the assignments of a SourceManager to each chain type
 */
@Managed()
export class SourceRouter {
  sourceManagers = new Map<SourceId, SourceManager>();

  logger: AttLogger;

  constructor(logger: AttLogger) {
    this.logger = logger;
  }

  /**
   * Assign @param sourceManager to @param sourceId
   */
  addSourceManager(sourceId: SourceId, sourceManager: SourceManager) {
    this.sourceManagers.set(sourceId, sourceManager);
  }

  /**
   * Starts attestation validation for given @param sourceId
   * @param sourceId 
   * @param attestation 
   * @returns 
   */
  validateAttestation(attestation: Attestation) {
    let sourceId = attestation.data.sourceId;
    const sourceManager = this.sourceManagers.get(sourceId);

    if (!sourceManager) {
      this.logger.error(`  ! '${sourceId}: undefined chain'`);
      //
      return undefined;
    }

    return sourceManager.validate(attestation);
  }
}
