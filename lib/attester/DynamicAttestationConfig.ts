import { loadavg } from "os";
import { AttLogger, getGlobalLogger } from "../utils/logger";
import { AttesterClientConfiguration } from "./AttesterClientConfiguration";

const fs = require("fs");

export class SourceHandlerConfig {
  source!: number;

  attestationLimitNormal: number = 1000;

  attestationLimitPriority: number = 100;

  requiredBlocks: number = 1;
}

export class AttestationConfig {
  startEpoch!: number;

  sourceHandlers = new Map<number, SourceHandlerConfig>();
}

export class AttestationConfigManager {
  config: AttesterClientConfiguration;
  logger: AttLogger;

  attestationConfig = new Array<AttestationConfig>();

  constructor(config: AttesterClientConfiguration, logger: AttLogger) {
    this.config = config;
    this.logger = logger;
  }

  async initialize() {
    await this.loadAll();

    this.dynamicLoadInitialize();
  }

  replacer(key: any, value: any) {
    if (value instanceof Map) {
      return {
        dataType: "Map",
        value: Array.from(value.entries()), // or with spread: value: [...value]
      };
    } else {
      return value;
    }
  }

  reviver(key: any, value: any) {
    if (typeof value === "object" && value !== null) {
      if (value.dataType === "Map") {
        return new Map(value.value);
      }
    }
    return value;
  }

  dynamicLoadInitialize() {
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
      this.logger.exception(`error: ${error}`);
    }
  }

  load(filename: string): boolean {
    this.logger.info(`DAC load '${filename}'`);

    const config = JSON.parse(fs.readFileSync(filename), this.reviver) as AttestationConfig;

    // todo: add warning if loading current epoch (or next one)
    // todo: disregard if epoch number is less than current epoch

    this.attestationConfig.push(config);

    return true;
  }

  orderConfigurations() {
    this.attestationConfig.sort((a: AttestationConfig, b: AttestationConfig) => {
      if (a.startEpoch < b.startEpoch) return 1;
      if (a.startEpoch > b.startEpoch) return -1;
      return 0;
    });
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
