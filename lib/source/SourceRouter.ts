import { Managed } from "@flarenetwork/mcc";
import { exit } from "process";
import { Attestation } from "../attester/Attestation";
import { AttestationRoundManager } from "../attester/AttestationRoundManager";
import { MOCK_NULL_WHEN_TESTING } from "../utils/utils";
import { SourceId, toSourceId } from "../verification/sources/sources";
import { SourceManager } from "./SourceManager";

/**
 * Class that stores the assignments of a SourceManager to each chain type
 */
@Managed()
export class SourceRouter {
  sourceManagers = new Map<SourceId, SourceManager>();

  attestationRoundManager: AttestationRoundManager;


  constructor(attestationRoundManager: AttestationRoundManager) {
    this.attestationRoundManager = attestationRoundManager;
  }

  get logger() {
    return this.attestationRoundManager.logger;
  }

  /**
   * Initialize existing source manager @param roundId verifier configs and create new verifier sources managers. 
   * @param roundId 
   */
  initializeSources(roundId: number) {
    const config = this.attestationRoundManager.attestationConfigManager.getConfig(roundId);

    for (let sourceName of config.verifierRouter.routeMap.keys()) {
      const sourceId = toSourceId(sourceName);
      let sourceManager = this.sourceManagers.get(sourceId);
      if (sourceManager) {
        sourceManager.setConfig(sourceId, roundId);
        continue;
      }

      // create new source manager
      sourceManager = new SourceManager(this.attestationRoundManager);
      sourceManager.setConfig(sourceId, roundId);
      this.addSourceManager(sourceId, sourceManager);
    }
    
    // todo: minimal memory optimization would be to delete obsolete source managers.
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
      this.logger.error(`${sourceId}: critical error, source not defined`);
      exit(1);
      return MOCK_NULL_WHEN_TESTING;
    }

    return sourceManager.validate(attestation);
  }
}
