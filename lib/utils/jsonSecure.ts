import { exit } from "process";
import { decryptString } from "./encrypt";
import { readJSONfromFile, readJSONfromString } from "./json";
import { getGlobalLogger } from "./logger";
import { getCredentialsKey } from "./credentialsKey";

export const secureMasterConfigs = [];
let networkName = "";

/**
 * read credentials from json and add it secure master config
 * @param filename
 */
function addSecureCredentials<T>(filename: string) {
    const config = readJSONfromFile<any>(filename, null, true);

    for (const key of Object.keys(config)) {
        secureMasterConfigs.push([key, config[key]]);
    }
}

/**
 * initialize json secure
 * 
 * reads data from `credentials.json.secure` and decrypt it.
 * all keys are added in secure master config
 * 
 * @param path
 * @param network 
 * @returns 
 */
export async function initializeJSONsecure<T>(path: string, network: string = "") {

    if (isInitializedJSONsecure()) return;

    networkName = network;

    // check if encrypted config exists
    const fs = require('fs');

    const secureCredentialsFilename = "credentials.json.secure";

    if (fs.existsSync(path + secureCredentialsFilename)) {

        const password = await getCredentialsKey();

        let data = fs.readFileSync(path + secureCredentialsFilename).toString();

        // decrypt
        data = decryptString(password, data);

        try {
            const config = readJSONfromString<any>(data, null, false);

            for (const key of Object.keys(config)) {

                secureMasterConfigs.push([key, config[key]]);
            }
        }
        catch (error) {
            getGlobalLogger().error( `error decrypting credentials ^R^w${path + secureCredentialsFilename}` );
            exit(500);
        }
    }
    else {
        addSecureCredentials(path + "chains.credentials.json");
        addSecureCredentials(path + "networks.credentials.json");
        addSecureCredentials(path + "database.credentials.json");
    }
}

/**
 * checks if secure JSON is initialized
 * @returns true if secure JSON is initialized
 */
export function isInitializedJSONsecure(): boolean {
    return networkName !== "";
}

/**
 * reads json and process it with secure data 
 * 
 * it reads json template and make credentials replacements (check `processData`).
 * 
 * @param filename
 * @param parser 
 * @param validate 
 * @returns 
 */
export function readJSONsecure<T>(filename: string, parser: any = null, validate = false): T {
    if (!isInitializedJSONsecure()) {
        return readJSONfromFile(filename, parser, validate);
    }

    const fs = require("fs");

    let data = fs.readFileSync(filename).toString();

    data = prepareSecureData(data, filename, networkName)

    return readJSONfromString<T>(data, parser, validate, filename);
}

/**
 * prepare template file `inputFilename` data `data` by replacing all $(key) instances from secure master config.
 * 
 * first it replaces all instances of `$(Network)` to value of `chain`.
 * second it replaces all instances of `$(key)` to value of 'key` from secure master config.
 * 
 * finally it checks if any instance of `$(` is left to validate that everything is correctly replaced.
 * 
 * @param data 
 * @param inputFilename 
 * @param chain 
 * @returns 
 */
export function prepareSecureData(data: string, inputFilename: string, chain: string): string {
    //logger.info(`processing ^G${inputFilename}^^ (${outputFilename})`);

    data = replaceAll(data, `Network`, chain);

    for (const config of secureMasterConfigs) {
        data = replaceAll(data, config[0], config[1]);
    }

    // check if any instance of `$(` is left - indicating some values were not defined
    const leftVariables = data.match(/\$\(([^\)]+)\)/g);

    if (leftVariables) {
        const leftVariablesNoDup = leftVariables.filter((item, index) => leftVariables.indexOf(item) === index);

        for (const left of leftVariablesNoDup) {
            getGlobalLogger().error(`file ^w${inputFilename}^^ (chain ^E${chain}^^) variable ^r^W${left}^^ left unset (check the configuration)`);
        }
    }

    return data;
}

/**
 * replace all instances of `from` to `to` in `source`.
 * @param source 
 * @param from 
 * @param to 
 * @returns 
 */
function replaceAll(source: string, from: string, to: string): string {
    while (1) {
        const newSource = source.replace(`$(${from})`, to);
        if (newSource === source) return source;
        source = newSource;
    }
}