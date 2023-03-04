import { Managed } from "@flarenetwork/mcc";
import { exit } from "process";
import { MOCK_NULL_WHEN_TESTING } from "../../utils/helpers/utils";
import { AttLogger } from "../../utils/logging/logger";
import { SourceId, toSourceId } from "../../verification/sources/sources";
import { GlobalConfigManager } from "../GlobalConfigManager";
import { SourceManager } from "./SourceManager";

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
  initializeSourcesForRound(roundId: number) {
    let verifierRouter = this.globalConfigManager.getVerifierRouter(roundId);
    for (let sourceName of verifierRouter.routeMap.keys()) {
      const sourceId = toSourceId(sourceName);
      let sourceManager = this.sourceManagers.get(sourceId);
      if (sourceManager) {
        sourceManager.refreshLatestRoundId(roundId);
        continue;
      }

      // create new source manager
      sourceManager = new SourceManager(this.globalConfigManager, sourceId);
      sourceManager.refreshLatestRoundId(roundId);
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
   * Returns source manager for given source
   * @param sourceId
   * @returns
   */
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
