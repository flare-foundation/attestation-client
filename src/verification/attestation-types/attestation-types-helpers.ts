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
