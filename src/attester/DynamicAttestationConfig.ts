import { ChainType } from "@flarenetwork/mcc";
import fs from "fs";
import { exit } from "process";
import { readJSON } from "../utils/json";
import { logException } from "../utils/logger";
import { JSONMapParser } from "../utils/utils";
import { AttestationType } from "../verification/generated/attestation-types-enum";
import { VerifierRouter } from "../verification/routing/VerifierRouter";
import { SourceId, toSourceId } from "../verification/sources/sources";
import { AttestationRoundManager } from "./AttestationRoundManager";

const DAC_REFRESH_TIME_S = 10;
export class SourceLimiterTypeConfig {
  // Weight presents the difficulty of validating the attestation depending on the attestation type and source
  weight!: number;
}

/**
 * Class providing parameters for handling the limitations (maxTotalRoundWeight, queryWindowInSec...) of a attestation round for a source
 */
export class SourceLimiterConfig {
  attestationType!: AttestationType;
  source!: SourceId;

  maxTotalRoundWeight!: number;

  numberOfConfirmations = 1;

  queryWindowInSec!: number;
  UBPUnconfirmedWindowInSec!: number;

  attestationTypes = new Map<number, SourceLimiterTypeConfig>();
}

/**
 * Class providing SourceLimiterConfig for each source from the @param startRoundId on.
 */
export class AttestationConfig {
  startRoundId!: number;
  chooseDeadlineSec: number = 45;

  sourceLimiters = new Map<number, SourceLimiterConfig>();

  verifierRouter = new VerifierRouter();

  isSupported(source: SourceId, type: AttestationType): boolean {
    const config = this.sourceLimiters.get(source);
    if (!config) return false;
    const typeConfig = config.attestationTypes.get(type);
    return !!typeConfig;
  }
}

/**
 * Class for managing attestation configurations
 */
export class AttestationConfigManager {
  attestationRoundManager: AttestationRoundManager;
  attestationConfig = new Array<AttestationConfig>();

  constructor(attestationRoundManager: AttestationRoundManager) {
    this.attestationRoundManager = attestationRoundManager;

    this.validateEnumNames();
  }

  get config() {
    return this.attestationRoundManager.config;
  }

  get logger() {
    return this.attestationRoundManager.logger;
  }

  /**
   * Checks that globally set enumerations of chains in Multi Chain Client and Attestation Client match
   */
  validateEnumNames() {
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

  async initialize() {
    await this.loadAll();

    await this.dynamicLoadInitialize();
  }


  async updateDynamicConfigForFile(event: string, filename: string) {
    try {
      if (filename && event === "rename") {
        // todo: check why on the fly report JSON error
        this.logger.debug(`DAC directory watch '${filename}' (event ${event})`);
        let result = await this.load(this.config.dynamicAttestationConfigurationFolder + filename);
        if (result) {
          this.orderConfigurations();
        } else {
          throw new Error(`Problems with loading file ${filename}`)
        }
      }
    } catch (error) {
      this.logger.exception(error);
      setTimeout(() => {
        this.updateDynamicConfigForFile(event, filename);
      }, DAC_REFRESH_TIME_S * 1000);
    }
  }
  /**
   * Check for changes in dynamicAttestationConfigurationFolder and loads new files
   */
  async dynamicLoadInitialize() {
    try {
      fs.watch(this.config.dynamicAttestationConfigurationFolder,
        async (event: string, filename: string) => this.updateDynamicConfigForFile(event, filename)
      );
    }
    catch (error) {
      this.logger.exception(error);
    }
  }

  /**
   * Loads all AttestationConfig that are stored in dynamicAttestationConfigurationFolder
   */
  async loadAll() {
    try {
      let files = fs.readdirSync(this.config.dynamicAttestationConfigurationFolder);
      if (files && files.length > 0) {
        const promises = files.map(async (filename: string) => {
          let result = await this.load(this.config.dynamicAttestationConfigurationFolder + filename);
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

  async load(filename: string, disregardObsolete = false): Promise<boolean> {
    let config: AttestationConfig;
    try {
      this.logger.info(`^GDAC load '${filename}'`);

      // todo: read with config (to get proper type)
      const fileConfig = readJSON<any>(filename, JSONMapParser);

      // check if loading current round (or next one)
      if (fileConfig.startRoundId == this.attestationRoundManager.activeRoundId || fileConfig.startRoundId == this.attestationRoundManager.activeRoundId + 1) {
        this.logger.warning(`DAC almost alive (epoch ${fileConfig.startRoundId})`);
      }

      // convert from file structure
      config = new AttestationConfig();
      config.startRoundId = fileConfig.startRoundId;

      // This initialization may fail, hence the dac initialization will fail
      // TODO: make a recovery mechanism
      await config.verifierRouter.initialize(config.startRoundId);

      // parse sources
      fileConfig.sources.forEach(
        (source: { attestationTypes: any[]; source: number; queryWindowInSec: number; UBPUnconfirmedWindowInSec: number; numberOfConfirmations: number; maxTotalRoundWeight: number }) => {
          const sourceLimiter = new SourceLimiterConfig();

          sourceLimiter.source = toSourceId(source.source);

          sourceLimiter.maxTotalRoundWeight = source.maxTotalRoundWeight;
          sourceLimiter.numberOfConfirmations = source.numberOfConfirmations;
          if(process.env.NODE_ENV === "development" && process.env.TEST_OVERRIDE_QUERY_WINDOW_IN_SEC) {
            sourceLimiter.queryWindowInSec = parseInt('' + process.env.TEST_OVERRIDE_QUERY_WINDOW_IN_SEC, 10);
            this.logger.info(`queryWindowInSec overridden by ${sourceLimiter.queryWindowInSec}`);
          } else {
            sourceLimiter.queryWindowInSec = source.queryWindowInSec;
          }
          
          sourceLimiter.UBPUnconfirmedWindowInSec = source.UBPUnconfirmedWindowInSec;

          config.sourceLimiters.set(sourceLimiter.source, sourceLimiter);

          // parse attestationTypes
          source.attestationTypes.forEach((attestationType) => {
            const type = (<any>AttestationType)[attestationType.type] as AttestationType;

            const attestationTypeHandler = new SourceLimiterTypeConfig();

            attestationTypeHandler.weight = attestationType.weight;

            sourceLimiter.attestationTypes.set(type, attestationTypeHandler);
          });
        }
      );

    } catch (e) {
      this.logger.error(e);
      return false;
    }
    if (config) {
      this.attestationConfig.push(config);
      return true;
    }
    return false;
  }

  /**
   * Sorts attestationConfig based on the startRoundId and clears Configs for the passed rounds
   */
  orderConfigurations() {
    this.attestationConfig.sort((a: AttestationConfig, b: AttestationConfig) => {
      if (a.startRoundId < b.startRoundId) return 1;
      if (a.startRoundId > b.startRoundId) return -1;
      return 0;
    });

    // cleanup
    for (let i = 1; i < this.attestationConfig.length; i++) {
      if (this.attestationConfig[i].startRoundId < this.attestationRoundManager.activeRoundId) {
        this.logger.debug(`DAC cleanup #${i} (roundId ${this.attestationConfig[i].startRoundId})`);
        this.attestationConfig.slice(i);
        return;
      }
    }
  }

  /**
   * @returns SourceLimiterConfig for a given @param source that is valid for in @param roundId
   */
  getSourceLimiterConfig(source: number, roundId: number): SourceLimiterConfig {
    // configs must be ordered by decreasing roundId number
    for (let i = 0; i < this.attestationConfig.length; i++) {
      if (this.attestationConfig[i].startRoundId < roundId) {
        return this.attestationConfig[i].sourceLimiters.get(source)!;
      }
    }

    this.logger.error(`DAC for source ${source} roundId ${roundId} does not exist`);

    return null;
  }

  /**
   * Returns the currently valid DAC configuration for give @param roundId
   * @param roundId 
   * @returns 
   */
  getAttestationConfig(roundId: number): AttestationConfig {
    // configs must be ordered by decreasing roundId number
    for (let i = 0; i < this.attestationConfig.length; i++) {
      if (this.attestationConfig[i].startRoundId < roundId) {
        return this.attestationConfig[i];
      }
    }

    this.logger.error(`DAC for roundId ${roundId} does not exist`);

    return null;
  }


  /**
   * @returns AttestationConfig for a given @param roundId
   */
  getConfig(roundId: number): AttestationConfig {
    // configs must be ordered by decreasing roundId number
    for (let i = 0; i < this.attestationConfig.length; i++) {
      if (this.attestationConfig[i].startRoundId < roundId) {
        return this.attestationConfig[i];
      }
    }

    this.logger.error(`DAC for roundId ${roundId} does not exist`);

    return null;
  }

  /**
   * @returns getVerifierRouter for a given @param roundId
   */
  getVerifierRouter(roundId: number): VerifierRouter {
    // configs must be ordered by decreasing roundId number
    for (let i = 0; i < this.attestationConfig.length; i++) {
      if (this.attestationConfig[i].startRoundId < roundId) {
        return this.attestationConfig[i].verifierRouter;
      }
    }

    this.logger.error(`DAC for round id ${roundId} does not exist (using default)`);

    exit(1);
  }
}
