import { getGlobalLogger, logException } from "./logger";

const DEFAULT_CONFIG_PATH = "prod";
const DEFAULT_DEBUG_CONFIG_PATH = "dev";


function isEqualType<T>(A: any): boolean {
  return true;
}


function readConfigBase<T>(project: string, type: string, mode: string=undefined): T {
  const fs = require("fs");

  let path = `./configs/`;

  if( mode ) {
    path += `${mode}/`;
  }
  else if (process.env.CONFIG_PATH) {
    path += `${process.env.CONFIG_PATH}/`;
    getGlobalLogger().debug2(`configuration using ^w^K${mode}^^`)
  }
  else {
    const modePath =  process.env.NODE_ENV==="development" ? DEFAULT_DEBUG_CONFIG_PATH : DEFAULT_CONFIG_PATH;
    path += `${modePath}/`;
    getGlobalLogger().warning(`configuration path not set. using ^w^K${modePath}^^`)
  }

  path += `${project}-${type}.json`;

  try {

    const res = JSON.parse(fs.readFileSync(path).toString()) as T;

    isEqualType<T>(res);

    getGlobalLogger().info(`^Gconfiguration ^K^w${path}^^ loaded`);

    return res;
  }
  catch (error) {
    logException(error, `${type} file ^K^w${path}^^ load error`);
  }
}

export function readConfig<T>(project: string, mode: string=undefined): T {
  return readConfigBase<T>(project, "config", mode);
}
export function readCredentials<T>(project: string, mode: string=undefined): T {
  return readConfigBase<T>(project, "credentials", mode);
}