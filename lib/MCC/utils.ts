import Web3 from "web3";
import BN from "bn.js";
const camelCase = require("camelcase");

// Constants
export const SATOSHI_BTC = 100000000;

export function ensure_data(data: any) {
  if (data.error !== null) {
    throw data.error.message;
  }
}

export function xrp_ensure_data(data: any) {
  if (data.result.status === "error") {
    throw data.result;
  }
}

export function algo_ensure_data(data: any) {
  const error_codes = [400, 401, 404, 500, 503];
  if (error_codes.includes(data.status)) {
    throw Error(`Error: ${data.data.message}`);
  }
}

export async function sleep(ms: number) {
  await new Promise<void>((resolve) => setTimeout(() => resolve(), ms));
}

export function unPrefix0x(tx: string) {
  return tx.startsWith("0x") ? tx.slice(2) : tx;
}

export function prefix0x(tx: string) {
  return tx.startsWith("0x") ? tx : "0x" + tx;
}

export function toHex(x: string | number | BN) {
  return Web3.utils.toHex(x);
}

export function toBN(x: string | number | BN, toZeroIfFails = false) {
  if (x && x.constructor?.name === "BN") return x as BN;
  try {
    return Web3.utils.toBN(x as any);
  } catch (e) {
    if (toZeroIfFails) {
      return Web3.utils.toBN(0);
    }
    throw e;
  }
}

export function toNumber(x: number | BN | undefined | null) {
  if (x === undefined || x === null) return undefined;
  if (x && x.constructor?.name === "BN") return (x as BN).toNumber();
  return x as number;
}

export function toCamelCase(obj: object): object {
  let camelObject: any = {};
  for (let prop in obj) {
    if (typeof (obj as any)[prop] == "object") {
      camelObject[camelCase(prop)] = toCamelCase((obj as any)[prop]);
    } else {
      camelObject[camelCase(prop)] = (obj as any)[prop];
    }
  }
  return camelObject;
}

export function camelToSnakeCase(str: string, splitWith: string = "-") {
  return str.replace(/[A-Z]/g, (letter) => `${splitWith}${letter.toLowerCase()}`);
}

export function toSnakeCase(obj: object, splitWith: string = "-"): object {
  let camelObject: any = {};
  for (let prop in obj) {
    if (typeof (obj as any)[prop] == "object") {
      camelObject[camelToSnakeCase(camelCase(prop), splitWith)] = toSnakeCase((obj as any)[prop], splitWith);
    } else {
      camelObject[camelToSnakeCase(camelCase(prop), splitWith)] = (obj as any)[prop];
    }
  }
  return camelObject;
}
