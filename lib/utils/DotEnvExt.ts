import dotenv from "dotenv";
import { getGlobalLogger } from "./logger";

function dotenvInclude(include: string) {
  if (include === null || include === undefined) return;

  for (const inc of include.split(";")) {
    getGlobalLogger().debug2(`dotenv include '${inc.trim()}'`);
    dotenv.config({ path: inc.trim() });
  }
}

export function DotEnvExt() {
  // initialize configuration
  if (process.env.DOTENV === "DEV") {
    getGlobalLogger().debug2("loading development env (.dev.env)");
    dotenv.config({ path: ".dev.env" });
  } else {
    dotenv.config();
  }

  dotenvInclude(process.env.DOTENV_DEVINCLUDE);
  dotenvInclude(process.env.DOTENV_INCLUDE);

  getGlobalLogger().debug2(`node mode ^K^w${process.env.NODE_ENV}^^`);

  //console.log(process.env);
}
