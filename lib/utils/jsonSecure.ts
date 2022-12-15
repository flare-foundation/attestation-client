import fs from "fs";
import path from "path";
import { exit } from "process";
import { getCredentialsKey } from "./credentialsKey";
import { decryptString } from "./encrypt";
import { readJSONfromFile, readJSONfromString } from "./json";
import { getGlobalLogger } from "./logger";

// We assume that one app run has only one network credentials.
export let secureMasterConfigs = [];
let networkName = "";

const CREDENTIALS_ERROR = 500;

/**
 * Read credentials from JSON and add it secure master config.
 * @param filename
 */
function addSecureCredentials<T>(filename: string) {
    const config = readJSONfromFile<any>(filename, null, true);

    for (const key of Object.keys(config)) {
        secureMasterConfigs.push([key, config[key]]);
    }
}

/**
 * Clear credentials. 
 * For testing purposes.
 */
export function _clearSecureCredentials() {
    networkName = "";
    secureMasterConfigs = [];
}

/**
 * Initialize JSON secure.
 * 
 * Reads data from `credentials.json.secure` and decrypt it.
 * All keys are added in @variable secureMasterConfigs.
 * 
 * @param credentialsPath
 * @param network 
 * @returns 
 */
export async function initializeJSONsecure<T>(credentialsPath: string, network: string = "", secureCredentialsFilename: string = "credentials.json.secure") {

    if (isInitializedJSONsecure()) {
        if (network !== "" && network != networkName) {
            getGlobalLogger().error(`only single network application supported`);
            exit(CREDENTIALS_ERROR);
        }
        return;
    }

    networkName = network;

    // check that no keys exist
    if (Object.keys(secureMasterConfigs).length > 0) {
        getGlobalLogger().error(`secure master config not empty`);
        exit(CREDENTIALS_ERROR);

        // when testing exit is stubbed to save value and continue
        return null;
    }

    // check if encrypted config exists
    const credentialsFilename = path.join(credentialsPath, secureCredentialsFilename);

    if (fs.existsSync(credentialsFilename)) {

        const password = await getCredentialsKey();

        let data = fs.readFileSync(credentialsFilename).toString();

        // decrypt
        data = decryptString(password, data);

        try {
            const config = readJSONfromString<any>(data, null, false);

            for (const key of Object.keys(config)) {
                if (secureMasterConfigs[key]) {
                    getGlobalLogger().error(`duplicate key '${key}' from '${credentialsFilename}'`);
                    exit(CREDENTIALS_ERROR);
                }
                secureMasterConfigs.push([key, config[key]]);
            }
        }
        catch (error) {
            getGlobalLogger().error(`error decrypting credentials ^R^w${credentialsFilename}`);
            exit(CREDENTIALS_ERROR);
        }
    }
    else {
        addSecureCredentials(path.join(credentialsPath, "chains.credentials.json"));
        addSecureCredentials(path.join(credentialsPath, "networks.credentials.json"));
        addSecureCredentials(path.join(credentialsPath, "database.credentials.json"));
    }
}

/**
 * Checks if secure JSON is initialized.
 * @returns true if secure JSON is initialized
 */
export function isInitializedJSONsecure(): boolean {
    return networkName !== "";
}

/**
 * Reads JSON data from @param filename and process it with secure data.
 * 
 * It reads JSON template and make credentials replacements (check @function _prepareSecureData).
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

    let data = fs.readFileSync(filename).toString();

    data = _prepareSecureData(data, filename, networkName)

    return readJSONfromString<T>(data, parser, validate, filename);
}

/**
 * Prepare template file @param inputFilename data @param data by replacing all $(key) instances from secure master config.
 * 
 * First it replaces all instances of `$(Network)` to value of @param chain.
 * Second it replaces all instances of `$(key)` to value of 'key` from secure master config.
 * 
 * Finally it checks if any instance of `$(` is left to validate that everything is correctly replaced.
 * 
 * @param data 
 * @param inputFilename 
 * @param chain 
 * @returns 
 */
export function _prepareSecureData(data: string, inputFilename: string, chain: string): string {
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
 * Replace all instances of @param from to @param to in @param source.
 * @param source 
 * @param from 
 * @param to 
 * @returns 
 */
function replaceAll(source: string, from: string, to: string): string {
    while (true) {
        const newSource = source.replace(`$(${from})`, to);
        if (newSource === source) return source;
        source = newSource;
    }
}