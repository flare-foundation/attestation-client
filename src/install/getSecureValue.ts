import { getSecureValue, initializeJSONsecure, readFileSecure } from "../utils/jsonSecure";
import { getGlobalLogger, logException, setGlobalLoggerLabel, setLoggerName } from "../utils/logger";


const DEFAULT_SECURE_CONFIG_PATH = "../attestation-suite-config";

const yargs = require("yargs");

const args = yargs
    .option("defaultSecureConfigPath", { alias: "p", type: "string", description: "start folder", default: DEFAULT_SECURE_CONFIG_PATH, demand: false })
    .option("network", { alias: "n", type: "string", description: "network", default: "Coston", demand: false })
    .option("secureVariable", { alias: "e", type: "string", description: "secure variable name", default: "", demand: false }).argv;

async function run() {
    await initializeJSONsecure(args["defaultSecureConfigPath"], args["network"]);

    const secureValue = getSecureValue(args["secureVariable"]);
    console.log(secureValue)

}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
