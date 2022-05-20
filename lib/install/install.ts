import { readJSON } from "../utils/config";
import { DotEnvExt } from "../utils/DotEnvExt";
import { getGlobalLogger } from "../utils/logger";


let logger = getGlobalLogger();

let path = "configs/.install/";

function replaceAll(source: string, from: string, to: string): string {
    while (1) {
        const newSource = source.replace(`$(${from})`, to);
        if (newSource === source) return source;
        source = newSource;
    }
}

async function prepareInstall(name: string, chain: string) {

    logger.group(`${chain}`)

    // replace all keywords from credentials .json files from source dir files and make replacements and copy into target dir
    const fs = require('fs');

    const credentialsDir = `${path}/`;

    const sourceDir = `${path}/templates`;
    const targetDir = `${path}/prepared/${chain}`;

    const configs = [
        readJSON<any>(`${credentialsDir}/chains.credentials.json`),
        readJSON<any>(`${credentialsDir}/database.credentials.json`),
        readJSON<any>(`${credentialsDir}/networks.credentials.json`)
    ];

    const files = fs.readdirSync(sourceDir);

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    for (const file of files) {
        logger.info(`   ${file}`)

        let data = fs.readFileSync(`${sourceDir}/${file}`).toString();

        data = replaceAll(data, `Network`, name);

        for (let config of configs) {
            for (let key of Object.keys(config)) {
                data = replaceAll(data, key, config[key]);
            }
        }

        fs.writeFileSync(`${targetDir}/${file}`, data);
    }
}

async function run() {
    await prepareInstall("Songbird", "songbird");
    await prepareInstall("Coston", "coston");
}


DotEnvExt();

console.log( process.argv );
if( process.argv.length >= 2 ) {
    path = process.argv[2];
    logger.info( `path '${path}'` );
}

run()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });