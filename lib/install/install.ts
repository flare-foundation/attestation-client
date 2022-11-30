import { readJSON } from "../utils/config";
import { DotEnvExt } from "../utils/DotEnvExt";
import { getGlobalLogger, logException } from "../utils/logger";

const logger = getGlobalLogger();

let path = "configs/.install/";

let errorResult = 0;

function replaceAll(source: string, from: string, to: string): string {
  while (1) {
    const newSource = source.replace(`$(${from})`, to);
    if (newSource === source) return source;
    source = newSource;
  }
}

async function prepareInstall(name: string, chain: string, first = false) {
  logger.group(`${chain}`);

  // replace all keywords from credentials .json files from source dir files and make replacements and copy into target dir
  const fs = require("fs");

  const credentialsDir = `${path}/`;

  const sourceDir = `${path}/templates`;
  const targetDir = `${path}/prepared/${chain}`;

  const templateDir = `configs/.install`;

  let configs = [];
  try {
    configs = [
      readJSON<any>(`${credentialsDir}/chains.credentials.json`, null, true),
      readJSON<any>(`${credentialsDir}/database.credentials.json`, null, true),
      readJSON<any>(`${credentialsDir}/networks.credentials.json`, null, true),
    ];
  }
  catch (error) {
    logException(error, `prepareInstall '${name}' chain '${chain}'`);
    errorResult = 1;
    return;
  }

  let templates = [];
  try {
    templates = [
      readJSON<any>(`${templateDir}/chains.credentials.json`, null, true),
      readJSON<any>(`${templateDir}/database.credentials.json`, null, true),
      readJSON<any>(`${templateDir}/networks.credentials.json`, null, true),
    ];
  }
  catch (error) {
    logException(error, `prepareInstall '${name}' chain '${chain}' (templates)`);
    errorResult = 1;
    return;
  }

  // check if all templates are in configs

  const fromTemplates = [];
  let missing = 0;

  for (const temp of templates) {
    for (const tempKey of Object.keys(temp)) {

      let found = 0;

      for (const config of configs) {
        for (const configKey of Object.keys(config)) {

          if (tempKey === configKey) {
            found++;
          }
        }
      }

      if (found === 0) {
        if (first) {
          getGlobalLogger().debug(`      key '${tempKey}' not found in user configuration. used default from templates (value '${temp[tempKey]}')`);
        }

        missing++;
        fromTemplates[tempKey] = temp[tempKey];
      }

      if (found > 1) {
        if (first) {
          getGlobalLogger().warning(`      key '${tempKey}' multiple definitions found (check configuration)`);
        }
      }
    }
  }

  // add missing settings
  if (missing > 0) {
    if (first) {
      getGlobalLogger().warning(`      using ${missing} keys from templates`);
    }
    configs.push(fromTemplates);
  }

  // add special env settings
  configs.push(fromEnv);

  const files = fs.readdirSync(sourceDir);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const file of files) {
    logger.info(`   ${file}`);

    let data = fs.readFileSync(`${sourceDir}/${file}`).toString();

    data = replaceAll(data, `Network`, name);

    for (const config of configs) {
      for (const key of Object.keys(config)) {
        data = replaceAll(data, key, config[key]);
      }
    }

    // check if any $( is left - indicating some values were not defined
    const leftVariables = data.match(/\$\(([^\)]+)\)/g);

    if (leftVariables) {
      const leftVariablesNoDup = leftVariables.filter((item, index) => leftVariables.indexOf(item) === index);

      for (const left of leftVariablesNoDup) {
        getGlobalLogger().error(`      file ^w${file}^^ (chain ^E${chain}^^) variable ^r^W${left}^^ left unset (check the configuration)`);
        errorResult = 2;
      }
    }

    fs.writeFileSync(`${targetDir}/${file}`, data);
  }
}

const fromEnv = [];
function addEnv(name: string) {
  if( !process.env[name] ) return;

  fromEnv[name] = process.env[name];
}

async function run() {

  addEnv("HOSTNAME");
  addEnv("SECRET_FLARE");
  addEnv("SECRET_SONGBIRD");
  addEnv("SECRET_COSTON");
  addEnv("SECRET_COSTON2");
  addEnv("SECRET_NODES_TESTNET");
  addEnv("SECRET_NODES_MAINNET");

  await prepareInstall("Flare", "flare", true);
  await prepareInstall("Songbird", "songbird");
  await prepareInstall("Coston", "coston");
  await prepareInstall("Coston2", "coston2");
}

DotEnvExt();

console.log(process.argv);
if (process.argv.length >= 2) {
  path = process.argv[2];
  logger.info(`path '${path}'`);
}

run()
  .then(() => process.exit(errorResult))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
