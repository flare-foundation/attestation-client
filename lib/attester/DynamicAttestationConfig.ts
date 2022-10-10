import { ChainType } from "@flarenetwork/mcc";
import { readJSON } from "../utils/config";
import { AttLogger, getGlobalLogger, logException } from "../utils/logger";
import { JSONMapParser } from "../utils/utils";
import { AttestationType } from "../verification/generated/attestation-types-enum";
import { SourceId, toSourceId } from "../verification/sources/sources";
import { AttestationRoundManager } from "./AttestationRoundManager";
import { AttesterClientConfiguration } from "./AttesterClientConfiguration";

const fs = require("fs");

// Unnecessary complications??
/**
 * Weight presents the difficulty of validating the attestation depands on the attestation type and source
 */
export class SourceHandlerTypeConfig {
  weight!: number;
}

// Why are these belowe classes??

//What is the purpose of this?
export class SourceHandlerConfig {
  attestationType!: AttestationType;
  source!: SourceId;

  maxTotalRoundWeight!: number;

  numberOfConfirmations: number = 1;

  queryWindowInSec!: number;
  UBPUnconfirmedWindowInSec!: number;

  attestationTypes = new Map<number, SourceHandlerTypeConfig>(); //What is number representing?
}

export class AttestationConfig {
  startEpoch!: number; // start epoch of what? Epoche when this config starts being used??

  sourceHandlers = new Map<number, SourceHandlerConfig>(); //What is number representing?
}

export class AttestationConfigManager {
  config: AttesterClientConfiguration;
  logger: AttLogger;

  attestationConfig = new Array<AttestationConfig>();

  constructor(config: AttesterClientConfiguration, logger: AttLogger) {
    this.config = config;
    this.logger = logger;

    this.validateEnumNames();
  }

  validateEnumNames() {
    const logger = getGlobalLogger();

    for (let value in ChainType) {
      if (typeof ChainType[value] === "number") {
        if (ChainType[value] !== SourceId[value]) {
          logger.error2(
            `ChainType and Source value mismatch ChainType.${ChainType[ChainType[value] as any]}=${ChainType[value]}, Source.${
              SourceId[SourceId[value] as any]
            }=${SourceId[value]}`
          );
        }

        if (ChainType[ChainType[value] as any] !== SourceId[SourceId[value] as any]) {
          logger.error2(
            `ChainType and Source key mismatch ChainType.${ChainType[ChainType[value] as any]}=${ChainType[value]}, Source.${
              SourceId[SourceId[value] as any]
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
    } catch (error) {
      this.logger.exception(error);
    }
  }

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

  load(filename: string, disregardObsolete: boolean = false): boolean {
    this.logger.info(`^GDAC load '${filename}'`);

    const fileConfig = readJSON<any>(filename, JSONMapParser);

    // check if loading current epoch (or next one)
    if (fileConfig.startEpoch == AttestationRoundManager.activeEpochId || fileConfig.startEpoch == AttestationRoundManager.activeEpochId + 1) {
      this.logger.warning(`DAC almost alive (epoch ${fileConfig.startEpoch})`);
    }

    // convert from file structure
    const config = new AttestationConfig();
    config.startEpoch = fileConfig.startEpoch;

    // parse sources
    fileConfig.sources.forEach(
      (source: {
        attestationTypes: any[];
        source: number;
        queryWindowInSec: number;
        UBPUnconfirmedWindowInSec: number;
        numberOfConfirmations: number;
        maxTotalRoundWeight: number;
      }) => {
        const sourceHandler = new SourceHandlerConfig();

        sourceHandler.source = toSourceId(source.source);

        sourceHandler.maxTotalRoundWeight = source.maxTotalRoundWeight;
        sourceHandler.numberOfConfirmations = source.numberOfConfirmations;
        sourceHandler.queryWindowInSec = source.queryWindowInSec;
        sourceHandler.UBPUnconfirmedWindowInSec = source.UBPUnconfirmedWindowInSec;

        config.sourceHandlers.set(sourceHandler.source, sourceHandler);

        // parse attestationTypes
        source.attestationTypes.forEach((attestationType) => {
          const type = (<any>AttestationType)[attestationType.type] as AttestationType;

          const attestationTypeHandler = new SourceHandlerTypeConfig();

          attestationTypeHandler.weight = attestationType.weight;

          sourceHandler.attestationTypes.set(type, attestationTypeHandler);
        });
      }
    );

    this.attestationConfig.push(config);

    return true;
  }

  orderConfigurations() {
    this.attestationConfig.sort((a: AttestationConfig, b: AttestationConfig) => {
      if (a.startEpoch < b.startEpoch) return 1;
      if (a.startEpoch > b.startEpoch) return -1;
      return 0;
    });

    // cleanup
    for (let a = 1; a < this.attestationConfig.length; a++) {
      if (this.attestationConfig[a].startEpoch < AttestationRoundManager.activeEpochId) {
        this.logger.debug(`DAC cleanup #${a} (epoch ${this.attestationConfig[a].startEpoch})`);
        this.attestationConfig.slice(a);
        return;
      }
    }
  }

  getSourceHandlerConfig(source: number, epoch: number): SourceHandlerConfig {
    // configs must be ordered by decreasing epoch number
    for (let a = 0; a < this.attestationConfig.length; a++) {
      if (this.attestationConfig[a].startEpoch < epoch) {
        return this.attestationConfig[a].sourceHandlers.get(source)!;
      }
    }

    this.logger.error(`DAC for source ${source} epoch ${epoch} does not exist (using default)`);

    return new SourceHandlerConfig();
  }
}
