import { getGlobalLogger, logException } from "../logging/logger";
import { IReflection } from "../reflection/reflection";
import { isEqualType } from "../reflection/typeReflection";
import { readJSONfromFile } from "./json";

const DEFAULT_CONFIG_PATH = "prod";
const DEFAULT_DEBUG_CONFIG_PATH = "dev";

/**
 * Read config file with all the parameters.
 * 
 * Function creates configuration object of @param obj and checks if all class members are set.
 * Any unset (non optional) members return error.
 * 
 * Instance class @param obj must be inherited from `IReflection`.
 * 
 * use `CONFIG_PATH` env variable to set configuration path. note that path start location is rooted in `<app_root>/.config/` folder.
 * 
 * `NODE_ENV` env variables controls default path (if mode or path modifiers are not used).
 * 
 * NOTE: used for un-encrypted credential and test purposes only!
 * @param project project name 
 * @param type configuration type (config, cretentials)
 * @param mode additional path mode modifier
 * @param userPath user path selector
 * @param obj configuration object instance
 * @returns 
 */
export function readConfigBase<T extends IReflection<T>>(project: string, type: string, mode: string = undefined, userPath: string = undefined, obj: T = null): T {
  let path = `./configs/`;

  if (userPath && userPath !== "") {
    path = userPath;
  } else {
    if (mode) {
      path += `${mode}/`;
    } else if (process.env.CONFIG_PATH) {
      path += `${process.env.CONFIG_PATH}/`;
      getGlobalLogger().debug2(`configuration env.CONFIG_PATH using ^w^K${process.env.CONFIG_PATH}^^`);
    } else {
      const modePath = process.env.NODE_ENV === "development" ? DEFAULT_DEBUG_CONFIG_PATH : DEFAULT_CONFIG_PATH;
      path += `${modePath}/`;
      getGlobalLogger().warning(`configuration path not set. using ^w^K${modePath}^^`);
    }
  }

  path += `${project}-${type}.json`;

  try {
    const res = readJSONfromFile<T>(path);

    // validate json read object with template class
    const valid = isEqualType(obj.instanciate(), res);

    if (valid) {
      getGlobalLogger().info(`^g^W ${project} ^^ ^Gconfiguration ^K^w${path}^^ loaded`);
    } else {
      getGlobalLogger().error2(` ${project}  configuration ^K^w${path}^^ has errors`);
    }

    return res;
  } catch (error) {
    logException(error, `${type} file ^K^w${path}^^ load error`);
  }
}

/**
 * Typed helper wrapper for for `readConfigBase` to read `config`.
 * NOTE: Reads un-encrypted configuration. To be used only for testing!
 * @param obj 
 * @param project 
 * @param mode 
 * @param userPath 
 * @returns 
 */
export function readConfig<T extends IReflection<T>>(obj: T, project: string, mode: string = undefined, userPath: string = undefined): T {
  return readConfigBase<T>(project, "config", mode, userPath, obj);
}
