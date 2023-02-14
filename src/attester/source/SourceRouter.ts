import { Managed } from "@flarenetwork/mcc";
import { exit } from "process";
import { Attestation } from "../Attestation";
import { AttestationRoundManager } from "../AttestationRoundManager";
import { MOCK_NULL_WHEN_TESTING } from "../../utils/helpers/utils";
import { SourceId, toSourceId } from "../../verification/sources/sources";
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
    const config = this.attestationRoundManager.globalConfigManager.getConfig(roundId);

    for (let sourceName of config.verifierRouter.routeMap.keys()) {
      const sourceId = toSourceId(sourceName);
      let sourceManager = this.sourceManagers.get(sourceId);
      if (sourceManager) {
        sourceManager.refreshVerifierSourceConfig(roundId);
        continue;
      }

      // create new source manager
      sourceManager = new SourceManager(this.attestationRoundManager, sourceId);
      sourceManager.refreshVerifierSourceConfig(roundId);
      this.addSourceManager(sourceId, sourceManager);
    }

    // FUTURE OPTIMIZATION: delete obsolete source managers.
  }

  /**
   * Assign @param sourceManager to @param sourceId
   */
  addSourceManager(sourceId: SourceId, sourceManager: SourceManager) {
    this.sourceManagers.set(sourceId, sourceManager);
  }

  /**
   * Starts attestation request verification for given @param sourceId
   * @param sourceId 
   * @param attestation 
   * @returns 
   */
  verifyAttestationRequest(attestation: Attestation) {
    let sourceId = attestation.data.sourceId;
    const sourceManager = this.sourceManagers.get(sourceId);

    if (!sourceManager) {
      this.logger.error(`${sourceId}: critical error, source not defined`);
      exit(1);
      return MOCK_NULL_WHEN_TESTING;
    }

    return sourceManager.verifyAttestationRequest(attestation);
  }
}
