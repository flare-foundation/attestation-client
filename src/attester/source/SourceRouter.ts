import { Managed } from "@flarenetwork/mcc";
import { SourceId, toSourceId } from "../../verification/sources/sources";
import { SourceManager } from "./SourceManager";
import { GlobalConfigManager } from "../GlobalConfigManager";
import { MOCK_NULL_WHEN_TESTING } from "../../utils/helpers/utils";
import { exit } from "process";
import { AttLogger } from "../../utils/logging/logger";

/**
 * Class that stores the assignments of a SourceManager to each chain type
 */
@Managed()
export class SourceRouter {
  sourceManagers = new Map<SourceId, SourceManager>();

  globalConfigManager: GlobalConfigManager;
  logger: AttLogger;

  constructor(globalConfigManager: GlobalConfigManager, logger: AttLogger) {
    this.globalConfigManager = globalConfigManager;
    this.logger = logger;
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

  getSourceManager(sourceId: SourceId): SourceManager {
    const sourceManager = this.sourceManagers.get(sourceId);
    if (!sourceManager) {
      this.logger.error(`${sourceId}: critical error, source not defined`);
      exit(1);
      return MOCK_NULL_WHEN_TESTING;
    }

    return sourceManager;
  }
}
