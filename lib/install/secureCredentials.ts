// secureCredential
// AttestationSuite tool to create encrypted credential file from credential jsons located in
// ../attestation-suite-config/
// `credentials.json.secure` contains all keys in all .json files in `path` folder (non recursive).
// this file should be copied into target config path.

import { exit } from "process";
import { getCredentialsKeyByAddress } from "../utils/credentialsKey";
import { encryptString } from "../utils/encrypt";
import { readJSONfromFile } from "../utils/json";
import { getGlobalLogger } from "../utils/logger";

const fs = require("fs");
const path = require('path');

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
    const output = args["output"];

    logger.group(`secureCredentials ^r${credentialsPath}`);

    const password = await getCredentialsKeyByAddress(passwordAddress);

    if (password.length < 8) {
        logger.error(`password must be at least 8 characters long`);
        exit(2);
    }

    // collect all json credential files from source path folder
    const files = fs.readdirSync(credentialsPath);

    let combinedConfigs = new Object();

    for (const file of files) {
        if (path.extname(file).toLowerCase() !== '.json') {
            continue;
        }

        logger.info(`  loading credentials ^R${file}`);

        const config = readJSONfromFile<any>(credentialsPath + file, null, true);

        for (const key of Object.keys(config)) {
            combinedConfigs[key] = config[key];
        }
    }

    // encrypt and save credentials
    const combinedConfigString = JSON.stringify(combinedConfigs);

    const encryptedConfig = encryptString(password, combinedConfigString);

    fs.writeFileSync(credentialsPath + output, encryptedConfig, "utf8");

    logger.info(`secure credentials saved in ^W${credentialsPath}^G${output}`);
}

run()
    .then(() => process.exit(1))
    .catch((error) => {
        logger.error(error);
        process.exit(1);
    });
