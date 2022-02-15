import dotenv from "dotenv";

function dotenvInclude(include: string) {

  if (include === null || include === undefined) return;

  for (const inc of include.split(";")) {
    console.log(`[dotenv include '${inc.trim()}']`);
    dotenv.config({ path: inc.trim() });
  }
}

export function DotEnvExt() {
  // initialize configuration
  if (process.env.DOTENV === "DEV") {
    console.log("[loading development env (.dev.env)]");
    dotenv.config({ path: ".dev.env" });
  } else {
    dotenv.config();
  }

  dotenvInclude(process.env.DOTENV_DEVINCLUDE);
  dotenvInclude(process.env.DOTENV_INCLUDE);

  console.log(`[mode=${process.env.NODE_ENV}`);
  //console.log(process.env);
}
