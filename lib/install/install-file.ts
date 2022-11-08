import { readJSON } from "../utils/config";
import { getGlobalLogger } from "../utils/logger";
import { getCryptoSafeRandom } from "../utils/utils";

const yargs = require("yargs");

// command line 
// -j filename : json config file
// -c name : chain name
// -r replace-with
// -i input filename
// -o output filename

const args = yargs
  .option("processConfig", { alias: "p", type: "boolean", description: "process json config folder", default: true, demand: false })
  .option("chainName", { alias: "c", type: "string", description: "chain name", default: "", demand: false })
  .option("replaceConfig", { alias: "r", type: "array", description: "Replace-with", default: "", demand: false })
  .option("withConfig", { alias: "w", type: "array", description: "replace-With", default: "", demand: false })
  .option("inputFilename", { alias: "i", type: "string", description: "input filename", default: "", demand: true })
  .option("outputFilename", { alias: "o", type: "string", description: "output filename", default: "", demand: true })

  .argv;


const logger = getGlobalLogger();

let errorResult = 0;

function replaceAll(source: string, from: string, to: string): string {
  while (1) {
    const newSource = source.replace(`$(${from})`, to);
    if (newSource === source) return source;
    source = newSource;
  }
}

async function generatePasswords(source: string, length = 32) {

  const search = `$(GENERATE_RANDOM_PASSWORD_${length})`;

  if (source.indexOf(search) === -1) {
    return source;
  }

  while (true) {
    const password = (await getCryptoSafeRandom(length)).substring(2,length+2);

    const newSource = source.replace(search, password);
    if (newSource === source) return source;
    source = newSource;
  }
}

const fs = require("fs");

const configs = [];
function readConfig(filename: string) {
  const config = readJSON<any>(filename, null, true);

  for (const key of Object.keys(config)) {

    configs.push([key, config[key]]);
  }
}

function addEnv(name: string) {
  if (!process.env[name]) {
    configs.push([name, ""]);
  }
  else {
    configs.push([name, process.env[name]]);
  }
}


async function processFile(inputFilename: string, outputFilename: string, chain: string) {
  logger.info(`processing ^G${inputFilename}^^ (${outputFilename})`);

  let data = fs.readFileSync(inputFilename).toString();

  data = replaceAll(data, `Network`, chain);

  for (const config of configs) {
    data = replaceAll(data, config[0], config[1]);
  }

  data = await generatePasswords(data, 16);
  data = await generatePasswords(data, 32);
  data = await generatePasswords(data, 64);

  // check if any $( is left - indicating some values were not defined
  const leftVariables = data.match(/\$\(([^\)]+)\)/g);

  if (leftVariables) {
    const leftVariablesNoDup = leftVariables.filter((item, index) => leftVariables.indexOf(item) === index);

    for (const left of leftVariablesNoDup) {
      getGlobalLogger().error(`      file ^w${inputFilename}^^ (chain ^E${chain}^^) variable ^r^W${left}^^ left unset (check the configuration)`);
      errorResult = 2;
    }
  }

  fs.writeFileSync(outputFilename, data);
}

async function run() {

  // read config from env specified folder
  if (args.processConfig) {
    if (process.env.JSON_CONFIG_PATH) {
      const files = fs.readdirSync(process.env.JSON_CONFIG_PATH);

      const path = require('path');

      for (const file of files) {
        if (path.extname(file).toLowerCase() !== '.json') {
          continue;
        }

        //logger.info(`   ${file}`);
        readConfig(`${process.env.JSON_CONFIG_PATH}/${file}`);
      }
    }
  }

  // add environment replaces
  addEnv("USER");
  addEnv("HOSTNAME");
  addEnv("CERT_EMAIL");
  addEnv("SECRET_FLARE");
  addEnv("SECRET_SONGBIRD");
  addEnv("SECRET_COSTON");
  addEnv("SECRET_COSTON2");
  addEnv("SECRET_NODES_TESTNET");
  addEnv("SECRET_NODES_MAINNET");

  // add command prompt 
  const replace = args["replaceConfig"];
  const withthis = args["withConfig"];

  let i = 0;
  for (const key of replace) {
    configs.push([key, withthis[i++]]);
  }

  await processFile(args["inputFilename"], args["outputFilename"], args["chainName"]);
}

//DotEnvExt();

//console.log(process.argv);

run()
  .then(() => process.exit(errorResult))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
