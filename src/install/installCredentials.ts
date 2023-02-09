import fs from "fs";
import path from "path";
import * as yargs from "yargs";
import { getCryptoSafeRandom } from "../utils/helpers/utils";
import { getGlobalLogger } from "../utils/logging/logger";

const args = yargs
    .option("input", { alias: "i", type: "string", description: "input directory", default: "configs/.install", demand: false })
    .option("output", { alias: "o", type: "string", description: "output directory", default: "credentials", demand: false }).argv;

const logger = getGlobalLogger();

async function generatePasswords(source: string, length = 32) {
    const search = `$(GENERATE_RANDOM_PASSWORD_${length})`;

    if (source.indexOf(search) === -1) {
        return source;
    }

    while (true) {
        const password = (await getCryptoSafeRandom(length)).substring(2, length + 2);
        const newSource = source.replace(search, password);
        if (newSource === source) return source;
        source = newSource;
    }
}

function createDirectory(name: string) {
    if (fs.existsSync(name)) return;
    fs.mkdirSync(name);
}

async function installCredentials() {
    logger.info(`^gInstalling Credentials`);

    const inputDirectory = args["input"];
    const outputDirectory = args["output"];

    logger.debug(`input directory ^w${inputDirectory}`);
    logger.debug(`output directory ^w${outputDirectory}`);

    createDirectory(outputDirectory);

    const files = fs.readdirSync(inputDirectory);

    logger.info( `copying ${files.length} credentials files`);

    for (const file of files) {
        if (!file.toLowerCase().endsWith('-credentials.json')) {
            continue;
        }

        logger.debug(`${file}`);

        let data = fs.readFileSync(path.join(inputDirectory, file)).toString();

        data = await generatePasswords(data, 16);
        data = await generatePasswords(data, 32);
        data = await generatePasswords(data, 48);
        data = await generatePasswords(data, 64);

        fs.writeFileSync(path.join(outputDirectory, file), data);
    }

    logger.info(`^gCompleted`);
}

const fromEnv = [];
function addEnv(name: string) {
    if (!process.env[name]) return;

    fromEnv[name] = process.env[name];
}

async function run() {
    await installCredentials();
}

run()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
