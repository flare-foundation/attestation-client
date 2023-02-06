import fs from "fs";
import path from "path";
import { exit } from "process";
import { getCredentialsKeyByAddress } from "../utils/config/credentialsKey";
import { readJSONfromFile } from "../utils/config/json";
import { getGlobalLogger } from "../utils/logging/logger";
import { encryptString } from "../utils/security/encrypt";

class Configuration {
    name: string;
    files: [];
    credentials: string;
}

class Configurations {
    configurations: [];
}

const DEFAULT_CONFIGURATION_PATH = "configs/.install/";
const logger = getGlobalLogger();


function collectKeysFromFile(filename: string): string[] {
    try {
        let data = fs.readFileSync(path.join(DEFAULT_CONFIGURATION_PATH, `templates`, filename)).toString();

        // remove all comments
        data = data.replace(/((["'])(?:\\[\s\S]|.)*?\2|\/(?![*\/])(?:\\.|\[(?:\\.|.)\]|.)*?\/)|\/\/.*?$|\/\*[\s\S]*?\*\//gm, "$1");

        const dataKeys = data.match(/\$\(([^\)]+)\)/g);

        const keys = [];

        if (dataKeys) {
            const dataKeysNoDup = dataKeys.filter((item, index) => dataKeys.indexOf(item) === index);
            for (const key of dataKeysNoDup) {
                keys.push(key.substring(2, key.length - 1));
                //getGlobalLogger().error(`      file ^w${inputFilename}^^ (chain ^E${chain}^^) variable ^r^W${key}^^ left unset (check the configuration)`);
            }

            logger.info(`collecting keys from file ^B${filename}^^: ${keys.length} key(s) collected`);

        }
        else {
            logger.info(`collecting keys from file ^B${filename}: no keys collected`);
        }

        return keys;
    }
    catch (error) { logger.exception(error); }
}

function createDirectory(name: string) {
    if (fs.existsSync(name)) return;
    fs.mkdirSync(name);
}

async function prepareConfiguration(configuration: Configuration) {
    logger.info(`preparing configuration ^R${configuration.name}`);

    // collect keys from all 

    const objectKeys = new Object();
    for (const file of configuration.files) {
        const keys = collectKeysFromFile(file);

        for (const key of keys) {
            if (!credentialKeys[key]) {
                logger.error(`key ^w${key}^^ not found in credentials`)
                continue;
            }
            objectKeys[key] = credentialKeys[key];
        }
    }

    const secureStorageRoot = `prepare.secure`;
    const secureStorage = path.join(secureStorageRoot, configuration.name);
    const secureTemplates = path.join(secureStorage, `templates`);

    createDirectory(secureStorageRoot);
    createDirectory(secureStorage);
    createDirectory(secureTemplates);

    const outputCredentials = path.join(secureStorage, `credentials.json.secure`);
    const outputKey = path.join(secureStorage, `credentials.key`);

    const password = await getCredentialsKeyByAddress(configuration.credentials);

    // encrypt and save credentials
    const combinedConfigString = JSON.stringify(objectKeys);
    const encryptedConfig = encryptString(password, combinedConfigString);
    fs.writeFileSync(outputCredentials, encryptedConfig, "utf8");

    // save credentials key
    fs.writeFileSync(outputKey, configuration.credentials, "utf8");

    logger.info(`secure credentials saved in ^G${outputCredentials}`);

    logger.info(`copying template files...`);
    // copy template files
    for (const file of configuration.files) {
        logger.info(`   ^W${file}`);
        const targetFilename = path.join(secureTemplates, file);
        createDirectory(path.dirname(targetFilename))
        fs.copyFileSync(
            path.join(DEFAULT_CONFIGURATION_PATH, `templates`, file),
            targetFilename);
    }
}

let credentialKeys = new Object();

async function prepareConfigurations() {

    logger.info(`loadin credential files...`);
    // load all credential files
    // collect all json credential files from source path folder
    const files = fs.readdirSync(DEFAULT_CONFIGURATION_PATH);
    credentialKeys = new Object();
    for (const file of files) {
        if (!file.toLowerCase().endsWith('-credentials.json')) {
            continue;
        }
        logger.info(`  loading credentials ^R${file}`);

        const filename = path.join(DEFAULT_CONFIGURATION_PATH, file);
        const config = readJSONfromFile<any>(filename, null, true);

        for (const key of Object.keys(config)) {
            if (credentialKeys[key]) {
                logger.error(`duplicate key '${key}' from '${filename}'`);
                exit(3);
            }
            credentialKeys[key] = config[key];
        }
    }

    // load configuration
    const configurations = <Configurations>readJSONfromFile(path.join(DEFAULT_CONFIGURATION_PATH, `configurations.json`));

    for (const configuration of configurations.configurations) {
        await prepareConfiguration(<Configuration>configuration);
    }
}

prepareConfigurations()
    .then(() => process.exit(0))
    .catch((error) => {
        logger.error(error);
        process.exit(1);
    });
