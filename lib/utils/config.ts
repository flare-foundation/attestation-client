import { getGlobalLogger, logException } from "./logger";

const DEFAULT_CONFIG_PATH = "prod";
const DEFAULT_DEBUG_CONFIG_PATH = "dev";


function isEqualType<T>(A: any): boolean {
  return true;
}


function readConfigBase<T>(project: string, mode: string): T {
  const fs = require("fs");

  let path = `./configs/`;

  if (process.env.CONFIG_PATH) {
    path += `${process.env.CONFIG_PATH}/`;
  }
  else {
    const modePath =  process.env.NODE_ENV==="development" ? DEFAULT_DEBUG_CONFIG_PATH : DEFAULT_CONFIG_PATH;
    path += `${modePath}/`;
    getGlobalLogger().warning(`configuration path not set. using ^w^K${modePath}^^`)
  }

  path += `${project}-${mode}.json`;

  try {

    const res = JSON.parse(fs.readFileSync(path).toString()) as T;

    isEqualType<T>(res);

    getGlobalLogger().info(`^Gconfiguration ^K^w${path}^^ loaded`);

    return res;
  }
  catch (error) {
    logException(error, `${mode} file ^K^w${path}^^ load error`);
  }
}

export function readConfig<T>(project: string): T {
  return readConfigBase<T>(project, "config");
}
export function readCredentials<T>(project: string): T {
  return readConfigBase<T>(project, "credentials");
}