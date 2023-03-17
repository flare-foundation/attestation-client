import fs from "fs";
import path from "path";
import { exit } from "process";
import yargs from "yargs";
import { getSecretByAddress } from "../utils/config/credentialsKey";
import { readJSONfromFile } from "../utils/config/json";
import { getGlobalLogger } from "../utils/logging/logger";
import { encryptString } from "../utils/security/encrypt";

// command line
// optional:
// -i input credentials path: path to the configuration json and credentials jsons and templates (../attestation-suite-config)
// -o output credentials path

const DEFAULT_CONFIGURATION_INPUT_PATH = "../attestation-suite-config";
const DEFAULT_TEMPLATES_INPUT_PATH = "configs/.install/templates";
const DEFAULT_CONFIGURATION_OUTPUT_PATH = "../.attestation-secure-config";

const args = yargs
  .option("input", { alias: "i", type: "string", description: "credentials input path", default: DEFAULT_CONFIGURATION_INPUT_PATH, demand: false })
  .option("templates", { alias: "t", type: "string", description: "templates input path", default: DEFAULT_TEMPLATES_INPUT_PATH, demand: false })
  .option("output", { alias: "o", type: "string", description: "credentials output path", default: DEFAULT_CONFIGURATION_OUTPUT_PATH, demand: false }).argv;

const inputPath = args["input"];
const templatesPath = args["templates"];
const outputPath = args["output"];

interface Configuration {
  name: string;
  files: [];
  keys: [];
  credentials: string;
}

interface Configurations {
  configurations: [];
}

const logger = getGlobalLogger();
let credentialKeys = new Object();
const keysUsed = new Map<string, number>();

function collectKeysFromTemplateFile(filename: string): string[] {
  try {
    let data = fs.readFileSync(path.join(templatesPath, filename)).toString();

    // remove all comments
    data = data.replace(/((["'])(?:\\[\s\S]|.)*?\2|\/(?![*\/])(?:\\.|\[(?:\\.|.)\]|.)*?\/)|\/\/.*?$|\/\*[\s\S]*?\*\//gm, "$1");
    const dataKeys = data.match(/\$\(([^\)]+)\)/g);

    // collect all unique keys
    const keys = [];
    if (dataKeys) {
      const dataKeysNoDup = dataKeys.filter((item, index) => dataKeys.indexOf(item) === index);
      for (const key of dataKeysNoDup) {
        keys.push(key.substring(2, key.length - 1));
        //getGlobalLogger().error(`      file ^w${inputFilename}^^ (chain ^E${chain}^^) variable ^r^W${key}^^ left unset (check the configuration)`);
      }
      logger.info(`collecting keys from file ^B${filename}^^: ${keys.length} key(s) collected`);
    } else {
      logger.info(`collecting keys from file ^B${filename}: no keys collected`);
    }
    return keys;
  } catch (error) {
    logger.exception(error);
  }
}

function createDirectory(name: string) {
  if (fs.existsSync(name)) return;
  fs.mkdirSync(name);
}

async function prepareConfiguration(configuration: Configuration) {
  logger.info(`preparing configuration ^R${configuration.name}`);

  // collect keys from all configuration files
  const objectKeys = new Object();
  for (const file of configuration.files) {
    const keys = collectKeysFromTemplateFile(file);

    for (const key of keys) {
      if (credentialKeys[key] === undefined) {
        logger.error(`ERROR: key ^w${key}^^ not found in credentials`);
        continue;
      }
      objectKeys[key] = credentialKeys[key];

      keysUsed.set(key, keysUsed.get(key) + 1);
    }
  }

  if (configuration.keys) {
    logger.info(`adding configurations keys`);

    for (const key of configuration.keys) {
      if (credentialKeys[key] === undefined) {
        logger.error(`ERROR: key ^w${key}^^ not found in credentials`);
        continue;
      }
      objectKeys[key] = credentialKeys[key];

      keysUsed.set(key, keysUsed.get(key) + 1);
    }
  }

  const secureStorage = path.join(outputPath, configuration.name);
  const secureTemplates = path.join(secureStorage, `templates`);

  createDirectory(outputPath);
  createDirectory(secureStorage);
  createDirectory(secureTemplates);

  const outputCredentials = path.join(secureStorage, `credentials.json.secure`);
  const outputKey = path.join(secureStorage, `credentials.key`);

  const password = await getSecretByAddress(configuration.credentials);

  // encrypt and save credentials
  const combinedConfigString = JSON.stringify(objectKeys);
  const encryptedConfig = encryptString(password, combinedConfigString);
  fs.writeFileSync(outputCredentials, encryptedConfig, "utf8");

  // save credentials key
  fs.writeFileSync(outputKey, configuration.credentials, "utf8");
  logger.info(`secure credentials saved in ^G${outputCredentials}`);

  // copy template files
  logger.info(`copying template files...`);
  for (const file of configuration.files) {
    logger.debug(`   ${file}`);
    const sourceFilename = path.join(secureTemplates, file);
    createDirectory(path.dirname(sourceFilename));
    fs.copyFileSync(path.join(templatesPath, file), sourceFilename);
  }
}

async function prepareConfigurations() {
  logger.info(`loadin credential files...`);
  logger.debug(`input path: ^W${inputPath}`);
  logger.debug(`templates path: ^W${templatesPath}`);
  logger.debug(`output path: ^W${outputPath}`);
  // load all credential files
  // collect all json credential files from source path folder
  const files = fs.readdirSync(inputPath);
  credentialKeys = new Object();
  for (const file of files) {
    if (!file.toLowerCase().endsWith("-credentials.json")) {
      continue;
    }
    logger.info(`  loading credentials ^R${file}`);
    const filename = path.join(inputPath, file);
    const config = readJSONfromFile<any>(filename, null, true);
    for (const key of Object.keys(config)) {
      if (credentialKeys[key]) {
        logger.error(`duplicate key '${key}' from '${filename}'`);
        exit(3);
      }
      credentialKeys[key] = config[key];

      keysUsed.set(key, 0);
    }
  }

  // load configuration
  const configurations = <Configurations>readJSONfromFile(path.join(inputPath, `configurations.json`));
  for (const configuration of configurations.configurations) {
    await prepareConfiguration(<Configuration>configuration);
  }

  // all done
  logger.info(`^Gsecure configurations preparation completed`);

  // report unused keys
  for (const key of keysUsed) {
    if (key[1] === 0) {
      logger.warning(`warning: key ${key[0]} not used`);
    }
  }
}

prepareConfigurations()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error);
    process.exit(1);
  });
