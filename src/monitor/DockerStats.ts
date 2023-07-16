import { Managed, optional } from "@flarenetwork/mcc";
import * as fs from "fs";
import { exit } from "process";
import { readSecureConfig } from "../utils/config/configSecure";
import { sleepMs } from "../utils/helpers/utils";
import { getGlobalLogger, logException } from "../utils/logging/logger";
import { Docker } from "../utils/monitoring/Docker";
import { AdditionalTypeInfo, IReflection } from "../utils/reflection/reflection";

/**
 * Docker Stats configuration.
 */
class DockerStatsConfig implements IReflection<DockerStatsConfig> {
  @optional() path: string = "../stats/docker_stats.json";
  @optional() interval = 5000;
  @optional() dockerSocketName: string = "/var/run/docker.sock";

  instantiate() {
    return new DockerStatsConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}

/**
 * Docker Stats.
 */
@Managed()
export class DockerStats {
  /**
   * Async run docker stats.
   */
  async runDockerStats() {
    const logger = getGlobalLogger();
    logger.info("Staring docker stats");

    const config = await readSecureConfig(new DockerStatsConfig(), "stats");

    logger.debug(`Docker socket: ^w${config.dockerSocketName}^^`);
    logger.debug(`File path: ^w${config.path}^^`);

    const docker = new Docker(config.dockerSocketName);

    const version = await docker.getVersion();
    const info = await docker.getInfo();

    logger.debug(`Docker version: ^w${version.Version}^^`);
    logger.debug(`API version: ^w${version.ApiVersion}^^ (min version ${version.MinAPIVersion})`);
    logger.debug(`Containers: ^w${info.Containers}^^`);
    logger.debug(`Images: ^w${info.Images}^^`);

    if (docker.dockerApiVersion < version.MinAPIVersion && docker.dockerApiVersion > version.ApiVersion) {
      logger.error(`Docker does not support requested app version ${docker.dockerApiVersion}`);
      exit(1);
    }

    while (true) {
      logger.info("Updating");
      try {
        const dockerInfo = await docker.getDockerInfo(true, (containerName) => {
          return containerName.startsWith(`attestation-`) || containerName.startsWith(`indexer-`) || containerName.startsWith(`monitor`);
        });

        // save info
        const data = JSON.stringify(dockerInfo);
        fs.writeFileSync(config.path, data);
      } catch (error) {
        logException(error, `runDockerStats`);
      }

      await sleepMs(config.interval);
    }
  }
}
