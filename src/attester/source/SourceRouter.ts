import { Managed } from "@flarenetwork/mcc";
import { AttLogger } from "../../utils/logging/logger";
import { SourceId, toSourceId } from "../../verification/sources/sources";
import { GlobalConfigManager } from "../GlobalConfigManager";
import { SourceManager } from "./SourceManager";

/**
 * Class that stores the assignments of a SourceManager to each chain type
 */
@Managed()
export class SourceRouter {
  sourceManagers = new Map<string, SourceManager>();

  globalConfigManager: GlobalConfigManager;
  logger: AttLogger;

  constructor(globalConfigManager: GlobalConfigManager) {
    this.globalConfigManager = globalConfigManager;
    this.logger = globalConfigManager.logger;
  }

  /**
   * Initialize existing source manager @param roundId verifier configs and create new verifier sources managers.
   * @param roundId
   */
  initializeSourcesForRound(roundId: number) {
    let verifierRouter = this.globalConfigManager.getVerifierRouter(roundId);
    for (let sourceName of verifierRouter.routeMap.keys()) {
      const sourceId = sourceName;
      // if (sourceId === SourceId.invalid) {
      //   this.logger.error(`Invalid source id. This should never happen! Terminating!`);
      //   process.exit(1);
      //   return; // Don't delete needed for testing
      // }
      let sourceManager = this.sourceManagers.get(sourceId);
      if (sourceManager) {
        sourceManager.refreshLatestRoundId(roundId);
        continue;
      }

      // create new source manager
      sourceManager = new SourceManager(this.globalConfigManager, sourceId);
      sourceManager.refreshLatestRoundId(roundId);
      this.sourceManagers.set(sourceId, sourceManager);
    }

    // FUTURE OPTIMIZATION: delete obsolete source managers.
  }

  /**
   * Returns source manager for given source
   * @param sourceId
   * @returns
   */
  getSourceManager(sourceId: string): SourceManager {
    const sourceManager = this.sourceManagers.get(sourceId);
    if (!sourceManager) {
      this.logger.error(`${sourceId}: critical error, source not defined`);
      process.exit(1);
      return; //for testing
    }
    return sourceManager;
  }
}
