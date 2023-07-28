import fs from "fs";
import path from "path";
import Web3 from "web3";
import { getSecureConfigRootPath, readSecureConfig } from "../utils/config/configSecure";
import { readJSONfromFile } from "../utils/config/json";
import { checkChainTypesMatchSourceIds } from "../utils/helpers/utils";
import { AttLogger, logException } from "../utils/logging/logger";
import { isEqualType } from "../utils/reflection/typeReflection";
import { AttestationDefinitionStore } from "../verification/attestation-types/AttestationDefinitionStore";
import { readAttestationTypeSchemes } from "../verification/attestation-types/attestation-types-helpers";
import { VerifierRouter } from "../verification/routing/VerifierRouter";
import { VerifierRouteConfig } from "../verification/routing/configs/VerifierRouteConfig";
import { AttestationClientConfig } from "./configs/AttestationClientConfig";
import { GlobalAttestationConfig } from "./configs/GlobalAttestationConfig";

const VERIFIER_CONFIG_FILE_RE = /^verifier-routes-(\d+)-config.json$/;
const GLOBAL_CONFIG_FILE_RE = /^global-(\d+)-config.json$/;
const CONFIG_JSON_RIGHT_STRIP_LENGTH = "-config-json".length;
interface VerifierRouterWithConfig {
  config: VerifierRouteConfig;
  router: VerifierRouter;
  hash: string;
}
/**
 * Manages loading and initialization of configurations, including:
 * - global configuration
 * - verifier routes configuration
 */
export class GlobalConfigManager {
  globalAttestationConfigs: GlobalAttestationConfig[] = [];
  verifierRoutersWithConfig: VerifierRouterWithConfig[] = [];
  hashToVerifierRouter = new Map<string, VerifierRouter>();
  definitionStore: AttestationDefinitionStore;

  attestationClientConfig: AttestationClientConfig;

  private _activeRoundId: number;

  logger: AttLogger;

  testing = false;

  constructor(attestationClientConfig: AttestationClientConfig, logger: AttLogger) {
    this.logger = logger;
    this.attestationClientConfig = attestationClientConfig;
    // Require matching of each ChainType to some SourceId.
    if (!checkChainTypesMatchSourceIds(this.logger)) {
      this.logger.error("Discrepancy between ChainType and SourceId enums. Critical error.");
      process.exit(1);
      return; // Don't delete needed for testing
    }
    this.definitionStore = new AttestationDefinitionStore();
  }

  /**
   * Sets active round id
   */
  public set activeRoundId(number) {
    this._activeRoundId = number;
  }

  /**
   * Gets active round id
   */
  public get activeRoundId(): number {
    if (this._activeRoundId === undefined) {
      // this should never happen - the first initialization of activeRoundId should
      // be earlier then the first call to the getter.
      throw new Error("activeRoundId not defined");
    }
    return this._activeRoundId;
  }

  /**
   * Returns attestation client label for logging.
   */
  public get label() {
    let label = "";
    if (this.attestationClientConfig.label !== "none") {
      label = `[${this.attestationClientConfig.label}]`;
    }
    return label;
  }

  /**
   * Initializes the configuration manager.
   */
  public async initialize(verifierConfigRefreshIntervalMs = 80000) {
    // load global configs at start
    try {
      await this.loadAllGlobalConfigs();
      // initiate loading verifier configs periodically
      // Note: on wrong config
      await this.refreshVerifierConfigs();
      setInterval(async () => {
        try {
          await this.refreshVerifierConfigs();
        } catch (error) {
          logException(error, `Critical error while refreshing verifier configs`);
          process.exit(1);
          return; // Don't delete needed for testing
        }
      }, verifierConfigRefreshIntervalMs);
      await this.definitionStore.initialize();
    } catch (error) {
      logException(error, `GlobalConfigManager::initialize: Critical error`);
      process.exit(1);
      return; // Don't delete needed for testing
    }
  }

  /**
   * @returns global configuration for a given @param roundId
   */
  public getGlobalConfig(roundId: number): GlobalAttestationConfig {
    // configs must be ordered by decreasing roundId number
    if (this.globalAttestationConfigs.length === 0) {
      this.logger.error(`${this.label} No global configurations.`);
      process.exit(1);
      return; // Don't delete needed for testing
    }
    let i = this.globalAttestationConfigs.length - 1;
    // Skip the future configs in regard to roundId
    while (i > 0 && this.globalAttestationConfigs[i].startRoundId > roundId) {
      i--;
    }
    if (i === 0) {
      if (this.globalAttestationConfigs[0].startRoundId > roundId) {
        this.logger.error(`${this.label} Round id (${roundId}) too low for the first global config (round: ${this.globalAttestationConfigs[0].startRoundId})`);
        process.exit(1);
        return; // Don't delete needed for testing
      }
      return this.globalAttestationConfigs[0];
    }
    return this.globalAttestationConfigs[i];
  }

  /**
   * @returns verifier router for a given @param roundId
   */
  public getVerifierRouter(roundId: number): VerifierRouter {
    let result = this.getVerifierRouterWithConfig(roundId);
    return result?.router; // ? is needed for testing, when undefined is returned
  }

  /**
   * @returns Verifier configuration for a given @param roundId
   */
  private getVerifierRouterWithConfig(roundId: number): VerifierRouterWithConfig {
    // configs must be ordered by decreasing roundId number

    if (this.verifierRoutersWithConfig.length === 0) {
      this.logger.error(`${this.label} No global configurations.`);
      process.exit(1);
      return; // Don't delete needed for testing
    }
    let i = this.verifierRoutersWithConfig.length - 1;
    // Skip the future configs in regard to roundId
    while (i > 0 && this.verifierRoutersWithConfig[i].config.startRoundId > roundId) {
      i--;
    }
    if (i === 0) {
      if (this.verifierRoutersWithConfig[0].config.startRoundId > roundId) {
        this.logger.error(
          `${this.label} Round id (${roundId}) too low for the first global config (round: ${this.verifierRoutersWithConfig[0].config.startRoundId})`
        );
        process.exit(1);
        return; // Don't delete needed for testing
      }
      return this.verifierRoutersWithConfig[0];
    }
    return this.verifierRoutersWithConfig[i];
  }

  /**
   * Loads all global configuration that are stored in `globalConfigurationsFolder`, defined in
   * attestation client configuration.
   * Note: on any configuration error the function throws exception.
   * The function should be called only on initialization.
   */
  private async loadAllGlobalConfigs() {
    let files = fs.readdirSync(this.attestationClientConfig.globalConfigurationsFolder);
    if (!files || files.length === 0) {
      throw new Error(`loadAllGlobalConfigs: no configuration files`);
    }
    const promises = files.map(async (filename: string) => {
      return this.loadGlobalConfig(filename);
    });
    const configs = await Promise.all(promises);

    this.globalAttestationConfigs = configs;

    this.sortGlobalConfigs();
  }

  /**
   * Refreshes verifier configurations and initializes relevant `VerifierRouter` objects.
   * It should be called on initialization and periodically, enabling hot configuration updates.
   *
   */
  private async refreshVerifierConfigs() {
    const definitions = await readAttestationTypeSchemes();
    let globalPath = getSecureConfigRootPath();
    let templateFolderPath = path.join(globalPath, `templates/verifier-client`);
    let files = fs.readdirSync(templateFolderPath);
    if (!files || files.length === 0) {
      throw new Error(`No verifier configuration files`);
    }
    const promises = files.map(async (filename: string) => {
      return await this.loadVerifierConfig(filename);
    });
    let configs = await Promise.all(promises);

    // re-use or initialize new VerifierRouters matching to configs
    let newVerifierRouteConfigs = configs.map((config) => {
      const hash = this.verifierRouteConfigHash(config);
      let router = this.hashToVerifierRouter.get(hash);
      // Create new router for new config
      if (!router) {
        router = new VerifierRouter();
        router.initialize(config, definitions);
        this.hashToVerifierRouter.set(hash, router);
        this.logger.info(`New config for round ${config.startRoundId} loaded.`);
      }
      return {
        config,
        router,
        hash,
      } as VerifierRouterWithConfig;
    });
    this.sortVerifierRouteConfigs(newVerifierRouteConfigs);

    // Log configurations change
    if (!this.compareConfigurations(this.verifierRoutersWithConfig, newVerifierRouteConfigs)) {
      this.logger.info(`${this.label} Verifier configurations have changed!`);
    }

    // Update new configurations
    this.verifierRoutersWithConfig = newVerifierRouteConfigs;
  }

  /**
   * Compares two lists of configurations with verifier routes.
   * @param configs1
   * @param configs2
   * @returns `true` if configuration lists fully match
   */
  private compareConfigurations(configs1: VerifierRouterWithConfig[], configs2: VerifierRouterWithConfig[]) {
    if (configs1.length !== configs2.length) return false;
    for (let i = 0; i < configs1.length; i++) {
      if (configs1[i].hash != configs2[i].hash) return false;
    }
    return true;
  }
  /**
   * Calculates a hash of a stringified verifier route config
   * @param verifierRouteConfig
   * @returns
   */
  private verifierRouteConfigHash(verifierRouteConfig: VerifierRouteConfig) {
    return Web3.utils.soliditySha3(JSON.stringify(verifierRouteConfig));
  }

  /**
   * Loads a specific verifier router configuration from a file with @param fileName in the
   * `verifer-router` subfolder of the configuration templates.
   * Note: on any error, `undefined` is returned and the error is logged.
   * @param fileName
   * @returns loaded verifer router configuration or `undefined` on error.
   */
  private async loadVerifierConfig(fileName: string): Promise<VerifierRouteConfig> {
    let startRoundId = parseInt(fileName.match(VERIFIER_CONFIG_FILE_RE)?.[1], 10);
    if (isNaN(startRoundId)) {
      throw new Error(`Wrongly named file for verifier client config: '${fileName}'`);
    }
    let projectName = path.join(`verifier-client`, fileName.slice(0, -CONFIG_JSON_RIGHT_STRIP_LENGTH));
    const config = await readSecureConfig(new VerifierRouteConfig(), projectName);
    // startRoundId in config must match the one in the file name
    if (config.startRoundId !== startRoundId) {
      throw new Error(`Error: wrong startRoundId in the config file: (${config.startRoundId}) in '${fileName}'. Config file ignored.`);
    }
    return config;
  }

  /**
   * Loads the configuration from a specific file.
   * @param filename
   * @param disregardObsolete
   * @returns loaded configuration or `undefined` in case of error
   */
  private loadGlobalConfig(filename: string): GlobalAttestationConfig {
    let startRoundId = parseInt(filename.match(GLOBAL_CONFIG_FILE_RE)?.[1], 10);
    if (isNaN(startRoundId)) {
      throw new Error(`Wrongly named file for global config: '${filename}'`);
    }

    const config = readJSONfromFile<GlobalAttestationConfig>(path.join(this.attestationClientConfig.globalConfigurationsFolder, filename));
    // startRoundId in config must match the one in the file name
    if (config.startRoundId !== startRoundId) {
      throw new Error(`Error: wrong startRoundId in the global config file: (${config.startRoundId}) in '${filename}'.`);
    }

    let obj = new GlobalAttestationConfig();
    Object.setPrototypeOf(config, Object.getPrototypeOf(obj));
    const valid = isEqualType(obj.instantiate(), config);
    if (!valid) {
      throw new Error(`Global configuration in file '${filename}' is invalid`);
    }
    config.initialize();
    return config;
  }

  /**
   * Sorts attestationConfig based on the startRoundId
   */
  private sortGlobalConfigs() {
    this.globalAttestationConfigs.sort((a: GlobalAttestationConfig, b: GlobalAttestationConfig) => a.startRoundId - b.startRoundId);
  }

  /**
   * Sorts verifierRoutersWithConfig based on the startRoundId
   */
  private sortVerifierRouteConfigs(verifierRoutersWithConfig: VerifierRouterWithConfig[]) {
    verifierRoutersWithConfig.sort((a: VerifierRouterWithConfig, b: VerifierRouterWithConfig) => a.config.startRoundId - b.config.startRoundId);
  }
}
