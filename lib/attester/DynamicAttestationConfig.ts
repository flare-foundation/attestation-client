import { ChainType } from "@flarenetwork/mcc";
import { readJSON } from "../utils/json";
import { getGlobalLogger, logException } from "../utils/logger";
import { JSONMapParser } from "../utils/utils";
import { AttestationType } from "../verification/generated/attestation-types-enum";
import { SourceId, toSourceId } from "../verification/sources/sources";
import { AttestationRoundManager } from "./AttestationRoundManager";

const fs = require("fs");
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
 * Class providing SourceLimiterConfig for each source from the startEpoch on??
 */
export class AttestationConfig {
  startEpoch!: number;

  sourceLimiters = new Map<number, SourceLimiterConfig>();
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
    const logger = getGlobalLogger();

    for (const value in ChainType) {
      if (typeof ChainType[value] === "number") {
        if (ChainType[value] !== SourceId[value]) {
          logger.error2(
            `ChainType and Source value mismatch ChainType.${ChainType[ChainType[value] as any]}=${ChainType[value]}, Source.${SourceId[SourceId[value] as any]
            }=${SourceId[value]}`
          );
        }

        if (ChainType[ChainType[value] as any] !== SourceId[SourceId[value] as any]) {
          logger.error2(
            `ChainType and Source key mismatch ChainType.${ChainType[ChainType[value] as any]}=${ChainType[value]}, Source.${SourceId[SourceId[value] as any]
            }=${SourceId[value]}`
          );
        }
      }
    }
  }

  async initialize() {
    await this.loadAll();

    this.dynamicLoadInitialize();
  }

  /**
   * Check for changes in dynamicAttestationConfigurationFolder and loads new files
   */
  dynamicLoadInitialize() {
    try {
      fs.watch(this.config.dynamicAttestationConfigurationFolder, (event: string, filename: string) => {
        if (filename && event === "rename") {
          // todo: check why on the fly report JSON error
          this.logger.debug(`DAC directory watch '${filename}' (event ${event})`);
          if (this.load(this.config.dynamicAttestationConfigurationFolder + filename)) {
            this.orderConfigurations();
          }
        }
      });
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
      await fs.readdir(this.config.dynamicAttestationConfigurationFolder, (err: number, files: string[]) => {
        if (files) {
          files.forEach((filename) => {
            this.load(this.config.dynamicAttestationConfigurationFolder + filename);
          });
          this.orderConfigurations();
        } else {
          this.logger.warning(`DAC: no configuration files`);
        }
      });
    } catch (error) {
      logException(error, `loadAll `);
    }
  }

  load(filename: string, disregardObsolete = false): boolean {
    this.logger.info(`^GDAC load '${filename}'`);

    const fileConfig = readJSON<any>(filename, JSONMapParser);

    // check if loading current epoch (or next one)
    if (fileConfig.startEpoch == this.attestationRoundManager.activeEpochId || fileConfig.startEpoch == this.attestationRoundManager.activeEpochId + 1) {
      this.logger.warning(`DAC almost alive (epoch ${fileConfig.startEpoch})`);
    }

    // convert from file structure
    const config = new AttestationConfig();
    config.startEpoch = fileConfig.startEpoch;

    // parse sources
    fileConfig.sources.forEach(
      (source: { attestationTypes: any[]; source: number; queryWindowInSec: number; UBPUnconfirmedWindowInSec: number; numberOfConfirmations: number; maxTotalRoundWeight: number }) => {
        const sourceLimiter = new SourceLimiterConfig();

        sourceLimiter.source = toSourceId(source.source);

        sourceLimiter.maxTotalRoundWeight = source.maxTotalRoundWeight;
        sourceLimiter.numberOfConfirmations = source.numberOfConfirmations;
        sourceLimiter.queryWindowInSec = source.queryWindowInSec;
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

    this.attestationConfig.push(config);

    return true;
  }

  /**
   * Sorts attestationConfig based on the startEpoch and clears Configs for the passed epochs
   */
  orderConfigurations() {
    this.attestationConfig.sort((a: AttestationConfig, b: AttestationConfig) => {
      if (a.startEpoch < b.startEpoch) return 1;
      if (a.startEpoch > b.startEpoch) return -1;
      return 0;
    });

    // cleanup
    for (let a = 1; a < this.attestationConfig.length; a++) {
      if (this.attestationConfig[a].startEpoch < this.attestationRoundManager.activeEpochId) {
        this.logger.debug(`DAC cleanup #${a} (epoch ${this.attestationConfig[a].startEpoch})`);
        this.attestationConfig.slice(a);
        return;
      }
    }
  }

  /**
   * @returns SourceLimiterConfig for a given @param source that is valid for in @param epoch
   */
  getSourceLimiterConfig(source: number, epoch: number): SourceLimiterConfig {
    // configs must be ordered by decreasing epoch number
    for (let a = 0; a < this.attestationConfig.length; a++) {
      if (this.attestationConfig[a].startEpoch < epoch) {
        return this.attestationConfig[a].sourceLimiters.get(source)!;
      }
    }

    this.logger.error(`DAC for source ${source} epoch ${epoch} does not exist (using default)`);

    return new SourceLimiterConfig();
  }
}
