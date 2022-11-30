import BN from "bn.js";
import glob from "glob";
import Web3 from "web3";
import { AttestationTypeScheme, NumberLike, SupportedSolidityType, WeightedRandomChoice } from "./attestation-types";

const toBN = Web3.utils.toBN;

export const ATT_TYPE_DEFINITIONS_ROOT = "lib/verification/attestation-types";

/**
 * Type mapper from (a subset of) Solidity types to Javascript/Typescript types, specific for
 * use with attestation type definitions.
 * @param type
 * @returns
 */
export function tsTypeForSolidityType(type: SupportedSolidityType) {
  switch (type) {
    case "uint8":
    case "uint16":
    case "uint32":
    case "uint64":
    case "uint128":
    case "uint256":
    case "int256":
      return "BN";
    case "bool":
      return "boolean";
    case "string":
    case "bytes4":
    case "bytes32":
      return "string";
    default:
      // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
      ((_: never): void => {})(type);
  }
}

/**
 * Helper random value generator for Solidity type values used in in randomized attestaion requests or responses.
 * Primarily used for testing
 * @param request attestation request or response object
 * @param key key of the object to randomize
 * @param type type definition object used for mapping the key
 * @returns
 */
export function randSol(request: any, key: string, type: SupportedSolidityType) {
  const web3 = new Web3();
  if (request[key]) {
    return request[key];
  }
  switch (type) {
    case "uint8":
      return toBN(web3.utils.randomHex(1));
    case "uint16":
      return toBN(web3.utils.randomHex(2));
    case "uint32":
      return toBN(web3.utils.randomHex(4));
    case "uint64":
      return toBN(web3.utils.randomHex(8));
    case "uint128":
      return toBN(web3.utils.randomHex(16));
    case "uint256":
      return toBN(web3.utils.randomHex(32));
    case "int256":
      return toBN(web3.utils.randomHex(30)); // signed!
    case "bool":
      return toBN(web3.utils.randomHex(1)).mod(toBN(2));
    case "string":
      return web3.utils.randomHex(32);
    case "bytes4":
      return web3.utils.randomHex(4);
    case "bytes32":
      return web3.utils.randomHex(32);
    default:
      // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
      ((_: never): void => {})(type);
  }
}

/**
 * Helper function to convert `NumberLike` type to number, if possible
 * @param n number to convert
 * @returns the number value, may be unsafe integer (if more than 2 ** 53 - 1)
 */
export function numberLikeToNumber(n: NumberLike): number | undefined {
  if (typeof n === "string") {
    return parseInt(n, 10);
  }
  if (n === undefined || n === null) return undefined;
  if (n && n.constructor?.name === "BN") return (n as BN).toNumber();
  return n as number;
}

/**
 * Returns the random element of the list
 * @param list
 * @returns the random element
 */
export function randomListElement<T>(list: T[]): T | undefined {
  const randN = Math.floor(Math.random() * list.length);
  return list[randN];
}

/**
 * Returns the random element of the list of weighted choices
 * @param choices list of weighted choices
 * @returns random value (name) of the selected weighted choice
 */
export function randomWeightedChoice<T>(choices: WeightedRandomChoice<T>[]): T {
  const weightSum = choices.map((choice) => choice.weight).reduce((a, b) => a + b);
  const randSum = Math.floor(Math.random() * (weightSum + 1));
  let tmpSum = 0;
  for (const choice of choices) {
    tmpSum += choice.weight;
    if (tmpSum >= randSum) return choice.name;
  }
  return choices[choices.length - 1].name;
}

/**
 * Lister of the attestation type definitions form file system
 * @returns the list of the names of the files matching the attestation type definition naming convention.
 */
export async function getAttTypesDefinitionFiles(): Promise<string[]> {
  const pattern = `t-*.${process.env.NODE_ENV === "development" ? "ts" : "js"}`;

  return new Promise((resolve, reject) => {
    glob(pattern, { cwd: ATT_TYPE_DEFINITIONS_ROOT }, (er: any, files: string[] | null) => {
      if (er) {
        reject(er);
      } else {
        if (files) {
          files.sort();
        }
        resolve(files || []);
      }
    });
  });
}

/**
 * Loader of the attestation type definition schemes
 * @returns list of attestation type definition schemes
 */
export async function readAttestationTypeSchemes(): Promise<AttestationTypeScheme[]> {
  const names = await getAttTypesDefinitionFiles();
  return names.map((name) => require(`../attestation-types/${name}`).TDEF as AttestationTypeScheme);
}

/**
 * Converts objects to Hex value (optionally left padded)
 * @param x input object
 * @param padToBytes places to (left) pad to (optional)
 * @returns (padded) hex valu
 */
export function toHex(x: string | number | BN, padToBytes?: number) {
  if ((padToBytes as any) > 0) {
    return Web3.utils.leftPad(Web3.utils.toHex(x), padToBytes! * 2);
  }
  return Web3.utils.toHex(x);
}

/**
 * Prefixes hex string with `0x` if the string is not yet prefixed
 * @param tx input hex string with or without `0x` prefix
 * @returns `0x` prefixed hex string.
 */
export function prefix0x(tx: string) {
  return tx.startsWith("0x") ? tx : "0x" + tx;
}

/**
 * Converts fields of an object to Hex values
 * @param obj input object
 * @returns object with matching fields to input object but instead having various number types (number, BN)
 * converted to hex values ('0x'-prefixed)
 */
export function hexlifyBN(obj: any): any {
  const isHexReqex = /^[0-9A-Fa-f]+$/;
  if (obj?.mul) {
    return prefix0x(toHex(obj));
  }
  if (Array.isArray(obj)) {
    return (obj as any[]).map((item) => hexlifyBN(item));
  }
  if (typeof obj === "object") {
    const res = {} as any;
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      res[key] = hexlifyBN(value);
    }
    return res;
  }
  if (typeof obj === "string" && obj.match(isHexReqex)) {
    return prefix0x(obj);
  }
  return obj;
}
