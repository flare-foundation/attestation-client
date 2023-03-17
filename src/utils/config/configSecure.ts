import fs from "fs";
import path from "path";
import { AttLogger, getGlobalLogger, logException } from "../logging/logger";
import { IReflection } from "../reflection/reflection";
import { isEqualType } from "../reflection/typeReflection";
import { initializeJSONsecure, readJSONsecure } from "./jsonSecure";

const DEFAULT_SECURE_CONFIG_PATH = "../attestation-suite-config";

/**
 * Read secure credentials file and substitude its variables in the template files.
 *
 * Function creates configurtion object of `obj` and checks if all class members are set.
 * Any unset (non optional) members return error.
 *
 * Instance class (obj) must be inherited from `IReflection`
 *
 * Use `SECURE_CONFIG_PATH` env variable to set configuration path if non standard (`../attestation-suite-config`). note that path in this function is absolute (different usage as with the `readConfigBase` function).
 *
 * Use `FLARE_NETWORK` env variables to specify the network (coston, coston2, flare, songbird).
 *
 * @param project project name
 * @param type configuration type (config, credentials)
 * @param obj configuration object instance
 * @returns
 */
async function readSecureConfigBase<T extends IReflection<T>>(project: string, type: string, obj: T = null, attLogger: AttLogger = null): Promise<T> {
  const logger = attLogger ?? getGlobalLogger();
  // if (process.env.TEST_CREDENTIALS && process.env.NODE_ENV === "development") {
  //     return readConfigBase<T>(project, type, undefined, undefined, obj, logger);
  // }

  let network = "coston2";
  if (process.env.FLARE_NETWORK) {
    network = `${process.env.FLARE_NETWORK}`;
    logger.debug2(`secure configuration env.FLARE_NETWORK using ^w^K${process.env.FLARE_NETWORK}^^`);
  } else {
    logger.warning(`secure configuration network not set. using network ^w^K${network}^^`);
  }

  let globalPath = getSecureConfigRootPath();
  await initializeJSONsecure(globalPath, network);
  let filePath = path.join(globalPath, `templates/${project}-${type}.json`);

  if (!fs.existsSync(filePath)) {
    if (process.env.NODE_ENV === "development") {
      logger.error(`Configuration file does not exist: '${filePath}'`);
      // if this file does not exists in target folder check if it exists in the template folder
      let templatepath = `./configs/.install/templates/${project}-${type}.json`;
      if (fs.existsSync(templatepath)) {
        filePath = templatepath;
        logger.debug(`secure configuration loading from ^w^K${filePath}^^...`);
      }
    } else {
      // in production the file must exist
      logger.error(`Configuration file does not exist: '${filePath}'`);
      process.exit(1);
    }
  }

  try {
    const res = await readJSONsecure<T>(filePath);
    Object.setPrototypeOf(res, Object.getPrototypeOf(obj));
    const valid = isEqualType(obj.instantiate(), res);
    if (valid) {
      logger.info(`^g^W${project}^^ ^Rsecure^G configuration ^K^w${filePath}^^ loaded`);
    } else {
      logger.error2(`${project} secure configuration ^K^w${filePath}^^ has errors`);
    }
    return res;
  } catch (error) {
    logException(error, `${type} file ^K^w${filePath}^^ load error`);
  }
}

/**
 * Returns the global configuration root folder path. This folder is expected to have:
 * - `templates` - subfolder
 * - encrypted credentials file (usually named `credentials.json.secure`)
 * @param attLogger
 * @returns
 */
export function getSecureConfigRootPath(attLogger?: AttLogger): string {
  const logger = attLogger ?? getGlobalLogger();
  let path = ``;
  if (process.env.SECURE_CONFIG_PATH) {
    path = `${process.env.SECURE_CONFIG_PATH}/`;
    logger.debug2(`secure configuration env.SECURE_CONFIG_PATH using ^w^K${process.env.SECURE_CONFIG_PATH}^^`);
  } else {
    const modePath = DEFAULT_SECURE_CONFIG_PATH;
    path = `${modePath}/`;
    logger.warning(`secure configuration path not set. using ^w^K${modePath}^^`);
  }
  return path;
}

/**
 * Helper class for `readSecureConfigBase` to read `config`.
 * @param obj
 * @param project
 * @returns
 */
export async function readSecureConfig<T extends IReflection<T>>(obj: T, project: string, logger?: AttLogger): Promise<T> {
  return await readSecureConfigBase<T>(project, "config", obj, logger);
}
