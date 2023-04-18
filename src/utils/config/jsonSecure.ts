import { sleepMs } from "@flarenetwork/mcc";
import fs from "fs";
import path from "path";
import { exit } from "process";
import { getGlobalLogger } from "../logging/logger";
import { decryptString } from "../security/encrypt";
import { getCredentialsKey, getSecretByAddress } from "./credentialsKey";
import { readJSONfromFile, readJSONfromString } from "./json";

// We assume that one app run has only one network credentials.
export let SECURE_MASTER_CONFIGS = [];
let NETWORK_NAME = "";
let initializing = false;

const CREDENTIALS_ERROR = 500;

export function getSecureValue(name: string): string {
  for (const value of SECURE_MASTER_CONFIGS) {
    if (value[0] === name) {
      return value[1];
    }
  }
  return "undefined";
}

/**
 * Read credentials from JSON and add it secure master config.
 * @param filename
 */
function addSecureCredentials<T>(filename: string) {
  const config = readJSONfromFile<any>(filename, null, true);
  for (const key of Object.keys(config)) {
    SECURE_MASTER_CONFIGS.push([key, config[key]]);
  }
}

/**
 * Clear credentials.
 * For testing purposes.
 */
export function _clearSecureCredentials() {
  NETWORK_NAME = "";
  SECURE_MASTER_CONFIGS = [];
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
  const logger = getGlobalLogger();
  while (initializing) {
    await sleepMs(100);
  }
  if (isInitializedJSONsecure()) {
    if (network !== "" && network != NETWORK_NAME) {
      logger.error(`only single network application supported`);
      exit(CREDENTIALS_ERROR);
    }
    return;
  }

  initializing = true;
  NETWORK_NAME = network;

  // check that no keys exist
  if (Object.keys(SECURE_MASTER_CONFIGS).length > 0) {
    logger.error(`secure master config not empty`);
    exit(CREDENTIALS_ERROR);

    // when testing exit is stubbed to save value and continue
    initializing = false;
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
        if (SECURE_MASTER_CONFIGS[key]) {
          logger.error(`duplicate key '${key}' from '${credentialsFilename}'`);
          exit(CREDENTIALS_ERROR);
        }
        SECURE_MASTER_CONFIGS.push([key, config[key]]);
      }
    } catch (error) {
      logger.error(`error decrypting credentials ^R^w${credentialsFilename}`);
      exit(CREDENTIALS_ERROR);
    }
  } else {
    if (process.env.NODE_ENV === "development" && process.env.TEST_CREDENTIALS) {
      logger.info(`TEST_CREDENTIALS mode: no encryption key needed`);
    } else {
      logger.warning(`secure credentials file not found ^R^w'${credentialsFilename}'`);
      logger.error(`reading non secure credentials`);

      // collect all json credential files from source path folder
      const files = fs.readdirSync(credentialsPath);
      for (const file of files) {
        if (!file.toLowerCase().endsWith("-credentials.json")) {
          continue;
        }
        logger.info(`loading credentials ^R${file}`);
        addSecureCredentials(path.join(credentialsPath, file));
      }
    }
  }
  initializing = false;
}

/**
 * Checks if secure JSON is initialized.
 * @returns true if secure JSON is initialized
 */
export function isInitializedJSONsecure(): boolean {
  return NETWORK_NAME !== "";
}

/**
 * Reads file  data from @param filename and process it with secure data.
 *
 * It reads file data and make credentials replacements (check @function _prepareSecureData).
 *
 * @param filename
 * @param parser
 * @param validate
 * @returns
 */
export async function readFileSecure(filename: string, parser: any = null, validate = false): Promise<string> {
  let data = fs.readFileSync(filename).toString();
  return await _prepareSecureData(data, filename, NETWORK_NAME);
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
export async function readJSONsecure<T>(filename: string, parser: any = null, validate = false): Promise<T> {
  if (!isInitializedJSONsecure()) {
    return readJSONfromFile(filename, parser, validate);
  }
  let data = fs.readFileSync(filename).toString();
  data = await _prepareSecureData(data, filename, NETWORK_NAME);
  return readJSONfromString<T>(data, parser, validate, filename);
}

/**
 * Prepare template file @param inputFilename data @param data by replacing all $(key) instances from secure master config.
 *
 * First it replaces all instances of `$(Network)` to value of @param chain.
 * Second it replaces all instances of `$(key)` to value of 'key` from secure master config.
 *
 * It recursively replaces all '$(`.
 *
 * Finally it checks if any instance of `$(` is left to validate that everything is correctly replaced.
 *
 * @param data
 * @param inputFilename
 * @param network
 * @param recursive counts how many times the recursive replacement of unknown tokens can occur.
 * @returns
 */
export async function _prepareSecureData(data: string, inputFilename: string, network: string, searchStub = "Network", recursive = 0): Promise<string> {
  const logger = getGlobalLogger();
  data = replaceAll(data, searchStub, network);

  let level = -1;
  let stack = [];
  for (var i = 0; i < data.length; i++) {
    const c = data.charAt(i);

    // check if new variable `$(`
    if (c === "$" && i < data.length - 1 && data.charAt(i + 1) === "(") {
      // open new stack
      level++;
      stack.push("");
      i++;
      continue;
    }
    // check if variable close ')'
    else if (level >= 0 && c === ")") {
      // process this level
      const search = stack[level];
      let secret = undefined;
      for (const config of SECURE_MASTER_CONFIGS) {
        if (config[0] === search) {
          secret = config[1] + "";
          break;
        }
      }
      if (!secret) {
        if (search.indexOf(":") > 0) {
          secret = await getSecretByAddress(search, false);
        }
      }
      if (secret) {
        data = replaceAll(data, search, secret);
        // return index back for replacement change (3 is because of `$()` that are not in search string but are also removed)
        i += secret.length - search.length - 3;
      } else {
        logger.error(`file ^w${inputFilename}^^ (chain ^E${network}^^) variable ^r^W$(${search})^^ left unset (check the configuration)`);
        secret = "";
      }

      // pop stack
      stack.pop();
      level--;

      // optimization: add secret to last stack (instead of returning for whole search)
      if (level >= 0) {
        stack[level] += secret;
      }
      continue;
    }
    if (level >= 0) {
      stack[level] += c;
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
