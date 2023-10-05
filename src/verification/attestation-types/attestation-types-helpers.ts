import BN from "bn.js";
import Web3 from "web3";
import { WeightedRandomChoice } from "./attestation-types";

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
 * Prefixes hex string with `0x` if the string is not yet prefixed.
 * It can handle also negative values.
 * @param tx input hex string with or without `0x` prefix
 * @returns `0x` prefixed hex string.
 */
export function prefix0xSigned(tx: string) {
  if (tx.startsWith("0x") || tx.startsWith("-0x")) {
    return tx;
  }
  if (tx.startsWith("-")) {
    return "-0x" + tx.slice(1);
  }
  return "0x" + tx;
}

/**
 * Converts fields of an object to Hex values
 * Note: negative values are hexlified with '-0x'.
 * This is compatible with web3.eth.encodeParameters
 * @param obj input object
 * @returns object with matching fields to input object but instead having various number types (number, BN)
 * converted to hex values ('0x'-prefixed).
 */
export function hexlifyBN(obj: any): any {
  const isHexReqex = /^[0-9A-Fa-f]+$/;
  if (obj?.mul) {
    return prefix0xSigned(toHex(obj));
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
    return prefix0xSigned(obj);
  }
  return obj;
}
