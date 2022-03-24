import { getGlobalLogger, logException } from "./logger";

const DEFAULT_CONFIG_PATH = "prod";

function readConfigBase<T>(project: string, mode: string) : T {
  const fs = require("fs");

  let path = `./configs/`;

  if( process.env.CONFIG_PATH ) {
    path += `${process.env.CONFIG_PATH}/`;
  }
  else {
    path += `${DEFAULT_CONFIG_PATH}/`;
    getGlobalLogger().warning(`configuration path not set. using ^w^Kprod^^`)
  }

  path += `${project}-${mode}.json`;

  try {

    const res =  JSON.parse(fs.readFileSync(path).toString()) as T;  

    getGlobalLogger().info( `^Gconfiguration ^K^w${path}^^ loaded` );

    return res;
  }
  catch( error ) {
    logException( error , `${mode} file ^K^w${path}^^ load error` );
  }
}

export function readConfig<T>(project: string) : T {
  return readConfigBase(project,"config");
}
export function readCredentials<T>(project: string) : T {
  return readConfigBase(project,"credentials");
}