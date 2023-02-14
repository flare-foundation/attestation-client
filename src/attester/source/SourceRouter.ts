import { Managed } from "@flarenetwork/mcc";

import { AttestationRoundManager } from "../AttestationRoundManager";
import { SourceId, toSourceId } from "../../verification/sources/sources";
import { SourceManager } from "./SourceManager";
import { GlobalConfigManager } from "../GlobalConfigManager";

/**
 * Class that stores the assignments of a SourceManager to each chain type
 */
@Managed()
export class SourceRouter {
  sourceManagers = new Map<SourceId, SourceManager>();

  globalConfigManager: GlobalConfigManager;

  constructor(globalConfigManager: GlobalConfigManager) {
    this.globalConfigManager = globalConfigManager;
  }

  /**
   * Initialize existing source manager @param roundId verifier configs and create new verifier sources managers.
   * @param roundId
   */
  initializeSources(roundId: number) {
    const config = this.globalConfigManager.getConfig(roundId);

    for (let sourceName of config.verifierRouter.routeMap.keys()) {
      const sourceId = toSourceId(sourceName);
      let sourceManager = this.sourceManagers.get(sourceId);
      if (sourceManager) {
        sourceManager.refreshVerifierSourceConfig(roundId);
        continue;
      }

      // create new source manager
      sourceManager = new SourceManager(this.globalConfigManager, sourceId);
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

  getSourceManager(sourceId: SourceId) {
    return this.sourceManagers.get(sourceId);
  }
}
