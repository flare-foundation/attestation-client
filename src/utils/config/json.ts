import { parser as theParser } from "clarinet";
import fs from "fs";
import { getGlobalLogger } from "../logging/logger";

/**
 * Extract a detailed JSON parse error
 * using https://github.com/dscape/clarinet
 *
 * @param {string} json
 * @returns {{snippet:string, message:string, line:number, column:number, position:number}} or undefined if no error
 */
function getJSONParseError(json) {
  let parser = theParser();
  let firstError = undefined;

  // generate a detailed error using the parser's state
  function makeError(e) {
    let currentNL = 0,
      nextNL = json.indexOf("\n"),
      line = 1;
    while (line < parser.line) {
      currentNL = nextNL;
      nextNL = json.indexOf("\n", currentNL + 1);
      ++line;
    }
    return {
      snippet: json.substr(currentNL + 1, nextNL - currentNL - 1),
      message: (e.message || "").split("\n", 1)[0],
      line: parser.line,
      column: parser.column,
    };
  }

  // trigger the parse error
  parser.onerror = function (e) {
    firstError = makeError(e);
    parser.close();
  };
  try {
    parser.write(json);
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

/**
 * Read json file from string.
 * Support of comments (end of line comments and multiline comments) and end element comma.
 *
 * @param data
 * @param parser
 * @param validate
 * @param filename
 * @returns
 */
export function readJSONfromString<T>(data: string, parser: any = null, validate = false, filename = ""): T {
  // remove all comments
  data = data.replace(/((["'])(?:\\[\s\S]|.)*?\2|\/(?![*\/])(?:\\.|\[(?:\\.|.)\]|.)*?\/)|\/\/.*?$|\/\*[\s\S]*?\*\//gm, "$1");

  // remove trailing commas
  data = data.replace(/\,(?!\s*?[\{\[\"\'\w])/g, "");

  if (validate) {
    const validateRes = getJSONParseError(data);
    if (validateRes) {
      getGlobalLogger().error(`readJSON error ^r^W${validateRes.message}^^ file ^e${filename}^w@${validateRes.line}^^ (snippet ^w^K${validateRes.snippet}^^)`);
      throw new Error(`error parsing json file ${filename}@${validateRes.line}: ${validateRes.message}`);
    }
  }

  const res = JSON.parse(data, parser) as T;
  return res;
}

/**
 * Read json from file.
 *
 * @param filename
 * @param parser
 * @param validate
 * @returns
 */
export function readJSONfromFile<T>(filename: string, parser: any = null, validate = false): T {
  let data = fs.readFileSync(filename).toString();
  return readJSONfromString<T>(data, parser, validate, filename);
}

/**
 * Default function to read json (from file).
 *
 * @param filename
 * @param parser
 * @param validate
 * @returns
 */
export function readJSON<T>(filename: string, parser: any = null, validate = false): T {
  return readJSONfromFile(filename, parser, validate);
}
