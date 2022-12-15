// secureCredential
// AttestationSuite tool to create encrypted credential file from credential jsons located in
// ../attestation-suite-config/
// `credentials.json.secure` contains all keys in all .json files in `path` folder (non recursive).
// this file should be copied into target config path.

import { getGlobalLogger } from "../utils/logger";
import { prepareSecureCredentials } from "./prepareSecureCredentials";

const logger = getGlobalLogger();

const yargs = require("yargs");

// command line 
// -a passwordAddress : password address (direct:password, GoogleCloudSecretManager:address)
// optional:
// -p path : path to the credentials jsons
// -o output filename: output path

const args = yargs
    .option("path", { alias: "p", type: "string", description: "credentials path", default: "../attestation-suite-config/", demand: false })
    .option("output", { alias: "o", type: "string", description: "credentials path", default: "credentials.json.secure", demand: false })
    .option("passwordAddress", { alias: "a", type: "string", description: "encryption password address", default: "direct:password", demand: true }).argv;

async function run() {

    const credentialsPath = args["path"];
    const passwordAddress = args["passwordAddress"].replace(" ", "");
    const output = `${credentialsPath}${args["output"]}`;

    await prepareSecureCredentials(credentialsPath, passwordAddress, output);
}

run()
    .then(() => process.exit(1))
    .catch((error) => {
        logger.error(error);
        process.exit(1);
    });
