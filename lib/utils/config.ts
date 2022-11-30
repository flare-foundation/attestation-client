import { getGlobalLogger, logException } from "./logger";
import { IReflection } from "./reflection";
import { isEqualType } from "./typeReflection";

const DEFAULT_CONFIG_PATH = "prod";
const DEFAULT_DEBUG_CONFIG_PATH = "dev";
import { parser as theParser} from 'clarinet';

// const clarinet = require('clarinet');

/**
   * Extract a detailed JSON parse error 
   * using https://github.com/dscape/clarinet
   * 
   * @param {string} json
   * @returns {{snippet:string, message:string, line:number, column:number, position:number}} or undefined if no error
   */
function getJSONParseError(json) {
  // let parser = clarinet.parser();
  let parser = theParser();  
  let firstError = undefined;

  // generate a detailed error using the parser's state
  function makeError(e) {
    let currentNL = 0, nextNL = json.indexOf('\n'), line = 1;
    while (line < parser.line) {
      currentNL = nextNL;
      nextNL = json.indexOf('\n', currentNL + 1);
      ++line;
    }
    return {
      snippet: json.substr(currentNL + 1, nextNL - currentNL - 1),
      message: (e.message || '').split('\n', 1)[0],
      line: parser.line,
      column: parser.column
    }
  }

  // trigger the parse error
  parser.onerror = function (e) {
    firstError = makeError(e);
    parser.close();
  };
  try {
    parser.write(json)
    parser.close();
  } catch (e) {
    if (firstError === undefined) {
      return makeError(e);
    } else {
      return firstError;
    }
  }

  return firstError;
}

export function parseJSON<T>(data: string, reviver: any = null) {
  try {
    // remove all comments
    data = data.replace(/((["'])(?:\\[\s\S]|.)*?\2|\/(?![*\/])(?:\\.|\[(?:\\.|.)\]|.)*?\/)|\/\/.*?$|\/\*[\s\S]*?\*\//gm, "$1");

    // remove trailing commas
    data = data.replace(/\,(?!\s*?[\{\[\"\'\w])/g, "");

    //console.log( data );

    const res = JSON.parse(data, reviver) as T;

    return res;
  }
  catch (error) {
    getGlobalLogger().error(`error parsing JSON`);
  }
}

export function readJSON<T>(filename: string, parser: any = null, validate = false) {
  const fs = require("fs");

  let data = fs.readFileSync(filename).toString();

  // remove all comments
  data = data.replace(/((["'])(?:\\[\s\S]|.)*?\2|\/(?![*\/])(?:\\.|\[(?:\\.|.)\]|.)*?\/)|\/\/.*?$|\/\*[\s\S]*?\*\//gm, "$1");

  // remove trailing commas
  data = data.replace(/\,(?!\s*?[\{\[\"\'\w])/g, "");

  //console.log( data );

  if (validate) {
    const validateRes = getJSONParseError(data);

    if (validateRes) {
      getGlobalLogger().error(`readJSON error ^r^W${validateRes.message}^^ file ^e${filename}^w@${validateRes.line}^^ (snippet ^w^K${validateRes.snippet}^^)`);
      throw new Error( `error parsing json file ${filename}@${validateRes.line}: ${validateRes.message}`);
      return null;
    }
  }

  const res = JSON.parse(data, parser) as T;

  return res;
}

function readConfigBase<T extends IReflection<T>>(project: string, type: string, mode: string = undefined, userPath: string = undefined, obj: T = null): T {
  let path = `./configs/`;

  if (userPath && userPath !== "") {
    path = userPath;
  } else {
    if (mode) {
      path += `${mode}/`;
    } else if (process.env.CONFIG_PATH) {
      path += `${process.env.CONFIG_PATH}/`;
      getGlobalLogger().debug2(`configuration env.CONFIG_PATH using ^w^K${process.env.CONFIG_PATH}^^`);
    } else {
      const modePath = process.env.NODE_ENV === "development" ? DEFAULT_DEBUG_CONFIG_PATH : DEFAULT_CONFIG_PATH;
      path += `${modePath}/`;
      getGlobalLogger().warning(`configuration path not set. using ^w^K${modePath}^^`);
    }
  }

  path += `${project}-${type}.json`;

  try {
    const res = readJSON<T>(path);

    const valid = isEqualType(obj.instanciate(), res);

    if (valid) {
      getGlobalLogger().info(`^g^W ${project} ^^ ^Gconfiguration ^K^w${path}^^ loaded`);
    } else {
      getGlobalLogger().error2(` ${project}  configuration ^K^w${path}^^ has errors`);
    }

    return res;
  } catch (error) {
    logException(error, `${type} file ^K^w${path}^^ load error`);
  }
}

export function readConfig<T extends IReflection<T>>(obj: T, project: string, mode: string = undefined, userPath: string = undefined): T {
  return readConfigBase<T>(project, "config", mode, userPath, obj);
}

export function readCredentials<T extends IReflection<T>>(obj: T, project: string, mode: string = undefined, userPath: string = undefined): T {
  return readConfigBase<T>(project, "credentials", mode, userPath, obj);
}
