import { ChainType } from "@flarenetwork/mcc";
import fs from "fs";
import { exit } from "process";
import { readJSON } from "../utils/config/json";
import { JSONMapParser } from "../utils/helpers/utils";
import { AttLogger, logException } from "../utils/logging/logger";
import { AttestationType } from "../verification/generated/attestation-types-enum";
import { VerifierRouter } from "../verification/routing/VerifierRouter";
import { SourceId, toSourceId } from "../verification/sources/sources";
import { AttestationClientConfig } from "./configs/AttestationClientConfig";
import { DAC_REFRESH_TIME_S, GlobalAttestationConfig } from "./configs/GlobalAttestationConfig";
import { SourceLimiterConfig, SourceLimiterTypeConfig } from "./configs/SourceLimiterConfig";

/**
 * Class for managing attestation configurations
 */

export class GlobalConfigManager {
  attestationConfigs = new Array<GlobalAttestationConfig>();

  attestationClientConfig: AttestationClientConfig;

  private _activeRoundId: number;

  logger: AttLogger;

  testing = false;

  constructor(attestationClientConfig: AttestationClientConfig, logger: AttLogger) {
    this.logger = logger;
    this.attestationClientConfig = attestationClientConfig;
    this.validateEnumNames();
  }

  public get attesterConfig() {
    return this.attestationClientConfig;
  }

  public set activeRoundId(number) {
    this._activeRoundId = number;
  }

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
    if (this.attestationClientConfig.label != "none") {
      label = `[${this.attestationClientConfig.label}]`;
    }
    return label;
  }

  /**
   * Reads and configurations and initializes attestation round manager
   */
  public async initialize() {
    await this.loadAll();
    await this.initializeChangeWatcher();
  }

  /**
   * @returns AttestationConfig for a given @param roundId
   */
  public getConfig(roundId: number): GlobalAttestationConfig {
    // configs must be ordered by decreasing roundId number
    for (let i = 0; i < this.attestationConfigs.length; i++) {
      if (this.attestationConfigs[i].startRoundId < roundId) {
        return this.attestationConfigs[i];
      }
    }
    this.logger.error(`DAC for roundId ${roundId} does not exist`);
    return null;
  }

  /**
   * @returns SourceLimiterConfig for a given @param source that is valid for in @param roundId
   */
  public getSourceLimiterConfig(source: number, roundId: number): SourceLimiterConfig {
    let config = this.getConfig(roundId);
    if (config) {
      return config.sourceLimiters.get(source);
    }
    this.logger.error(`DAC for source ${source} roundId ${roundId} does not exist`);
    return null;
  }

  /**
   * @returns getVerifierRouter for a given @param roundId
   */
  public getVerifierRouter(roundId: number): VerifierRouter {
    let config = this.getConfig(roundId);
    if (config) {
      return config.verifierRouter;
    }
    this.logger.error(`DAC for round id ${roundId} does not exist (using default)`);
    exit(1);
  }

  /**
   * Checks that globally set enumerations of chains in Multi Chain Client and Attestation Client match
   */
  private validateEnumNames() {
    for (const value in ChainType) {
      if (typeof ChainType[value] === "number") {
        if (ChainType[value] !== SourceId[value]) {
          this.logger.error2(
            `ChainType and Source value mismatch ChainType.${ChainType[ChainType[value] as any]}=${ChainType[value]}, Source.${SourceId[SourceId[value] as any]
            }=${SourceId[value]}`
          );
        }

        if (ChainType[ChainType[value] as any] !== SourceId[SourceId[value] as any]) {
          this.logger.error2(
            `ChainType and Source key mismatch ChainType.${ChainType[ChainType[value] as any]}=${ChainType[value]}, Source.${SourceId[SourceId[value] as any]
            }=${SourceId[value]}`
          );
        }
      }
    }
  }

  /**
   * Tries to update global configuration. If the update is not successful, it triggers retries.
   * @param event 
   * @param filename 
   */
  private async updateDynamicConfigForFile(event: string, filename: string) {
    try {
      if (filename && event === "rename") {
        // todo: check why on the fly report JSON error
        this.logger.debug(`DAC directory watch '${filename}' (event ${event})`);
        let result = await this.load(this.attesterConfig.dynamicAttestationConfigurationFolder + filename);
        if (result) {
          this.orderConfigurations();
        } else {
          throw new Error(`Problems with loading file ${filename}`);
        }
      }
    } catch (error) {
      this.logger.exception(error);
      setTimeout(() => {
        this.updateDynamicConfigForFile(event, filename);
        this.logger.debug(`DAC retrying reading global config from '${filename}' (event ${event})`);
      }, DAC_REFRESH_TIME_S * 1000);
    }
  }

  /**
   * Initializes file change watcher for configuration changes, that trigger updates of configurations.
   */
  private async initializeChangeWatcher() {
    try {
      fs.watch(this.attesterConfig.dynamicAttestationConfigurationFolder, async (event: string, filename: string) =>
        this.updateDynamicConfigForFile(event, filename)
      );
    } catch (error) {
      this.logger.exception(error);
    }
  }

  /**
   * Loads all AttestationConfig that are stored in dynamicAttestationConfigurationFolder
   */
  private async loadAll() {
    try {
      let files = fs.readdirSync(this.attesterConfig.dynamicAttestationConfigurationFolder);
      if (files && files.length > 0) {
        const promises = files.map(async (filename: string) => {
          let result = await this.load(this.attesterConfig.dynamicAttestationConfigurationFolder + filename);
          if (!result) {
            this.logger.error(`Failure while loading ${filename}. Stopping!`);
            process.exit(1);
          }
        });
        await Promise.all(promises);
        this.orderConfigurations();
      } else {
        this.logger.error(`DAC: no configuration files`);
        process.exit(1);
      }
    } catch (error) {
      logException(error, `loadAll`);
      process.exit(1);
    }
  }

  /**
   * Loads the configuration from a specific file.
   * @param filename 
   * @param disregardObsolete 
   * @returns 
   */
  private async load(filename: string, disregardObsolete = false): Promise<boolean> {
    let config: GlobalAttestationConfig;
    try {
      this.logger.info(`^GDAC load '${filename}'`);

      // todo: read with config (to get proper type)
      const fileConfig = readJSON<any>(filename, JSONMapParser);

      // check if loading current round (or next one)
      if (fileConfig.startRoundId == this.activeRoundId || fileConfig.startRoundId == this.activeRoundId + 1) {
        this.logger.warning(`DAC almost alive (epoch ${fileConfig.startRoundId})`);
      } //logging

      // convert from file structure
      config = new GlobalAttestationConfig();
      config.startRoundId = fileConfig.startRoundId;
      config.defaultSetAssignerAddresses = fileConfig.defaultSetAssignerAddresses;
      config.consensusSubsetSize = fileConfig.consensusSubsetSize;

      // This initialization may fail, hence the dac initialization will fail
      // TODO: make a recovery mechanism
      await config.verifierRouter.initialize(config.startRoundId, this.logger, undefined, this.testing);

      // parse sources
      fileConfig.sources.forEach((source: { attestationTypes: any[]; source: number; numberOfConfirmations: number; maxTotalRoundWeight: number }) => {
        const sourceLimiterConfig = new SourceLimiterConfig();

        sourceLimiterConfig.source = toSourceId(source.source);
        sourceLimiterConfig.maxTotalRoundWeight = source.maxTotalRoundWeight;
        config.sourceLimiters.set(sourceLimiterConfig.source, sourceLimiterConfig);

        // parse attestationTypes
        source.attestationTypes.forEach((attestationType) => {
          const type = (<any>AttestationType)[attestationType.type] as AttestationType;
          const attestationTypeHandler = new SourceLimiterTypeConfig();
          attestationTypeHandler.weight = attestationType.weight;
          sourceLimiterConfig.attestationTypes.set(type, attestationTypeHandler);
        });
      });
    } catch (e) {
      this.logger.error(e);
      return false;
    }
    if (config) {
      this.attestationConfigs.push(config);
      return true;
    }
    return false;
  }

  /**
   * Sorts attestationConfig based on the startRoundId and clears Configs for the passed rounds
   */
  private orderConfigurations() {
    this.attestationConfigs.sort((a: GlobalAttestationConfig, b: GlobalAttestationConfig) => {
      if (a.startRoundId < b.startRoundId) return 1;
      if (a.startRoundId > b.startRoundId) return -1;
      return 0;
    });

    // cleanup
    for (let i = 1; i < this.attestationConfigs.length; i++) {
      if (this.attestationConfigs[i].startRoundId < this.activeRoundId) {
        this.logger.debug(`DAC cleanup #${i} (roundId ${this.attestationConfigs[i].startRoundId})`);
        this.attestationConfigs.splice(i);
        return;
      }
    }
  }
}
