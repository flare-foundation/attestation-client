import assert from "assert";
import { ChainType, MCC, prefix0x, toBN, toNumber, unPrefix0x } from "flare-mcc";
import Web3 from "web3";
import { toHex } from "../../utils/utils";
import { ARType } from "../generated/attestation-request-types";
import { AttestationType } from "../generated/attestation-types-enum";
import { AttestationRequestParseError, AttestationRequestScheme, AttestationTypeScheme, ATT_BYTES, CHAIN_ID_BYTES, NumberLike, SupportedRequestType, SupportedSolidityType, WeightedRandomChoice } from "./attestation-types";

export function attestationTypeSchemeIndex(schemes: AttestationTypeScheme[]): Map<AttestationType, AttestationTypeScheme> {
  let index = new Map<AttestationType, AttestationTypeScheme>();
  for (let scheme of schemes) {
    let type = scheme.id as AttestationType;
    assert(index.get(type) == null, "Duplicate AttestationTypeScheme");
    index.set(type, scheme);
  }
  return index;
}

// Assumes bytes are not 0x prefixed
function fromUnprefixedBytes(bytes: string, scheme: AttestationRequestScheme) {
  assert(bytes.length % 2 === 0, "Bytes length must be even");
  assert(bytes.length === scheme.size * 2, "Bytes length does not match the scheme");
  switch (scheme.type) {
    case "AttestationType":
      return toBN(prefix0x(bytes)).toNumber() as AttestationType;
    case "NumberLike":
      return toBN(prefix0x(bytes));
    case "ChainType":
      return toBN(prefix0x(bytes)).toNumber() as ChainType;
    case "BytesLike":
      return toHex(prefix0x(bytes), scheme.size);
    default:
      // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
      ((_: never): void => { })(scheme.type);
  }
}

function toUnprefixedBytes(value: any, scheme: AttestationRequestScheme) {
  switch (scheme.type) {
    case "AttestationType":
      return unPrefix0x(toHex(value as number, scheme.size));
    case "NumberLike":
      return unPrefix0x(toHex(value, scheme.size));
    case "ChainType":
      return unPrefix0x(toHex(value as number, scheme.size));
    case "BytesLike":
      return unPrefix0x(toHex(value, scheme.size));
    default:
      // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
      ((_: never): void => { })(scheme.type);
  }
}

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
      ((_: never): void => { })(type);
  }
}

export function randSol(request: any, key: string, type: SupportedSolidityType) {
  let web3 = new Web3();
  if (request[key]) {
    return request[key];
  }
  switch (type) {
    case "uint8":
      return toBN(web3.utils.randomHex(1))
    case "uint16":
      return toBN(web3.utils.randomHex(2))
    case "uint32":
      return toBN(web3.utils.randomHex(4))
    case "uint64":
      return toBN(web3.utils.randomHex(8))
    case "uint128":
      return toBN(web3.utils.randomHex(16))
    case "uint256":
      return toBN(web3.utils.randomHex(32))
    case "int256":
      return toBN(web3.utils.randomHex(30))  // signed!
    case "bool":
      return toBN(web3.utils.randomHex(1)).mod(toBN(2));
    case "string":
      return web3.utils.randomHex(32)
    case "bytes4":
      return web3.utils.randomHex(4)
    case "bytes32":
      return web3.utils.randomHex(32)
    default:
      // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
      ((_: never): void => { })(type);
  }
}

export function randReqItem(scheme: AttestationRequestScheme) {
  let rand = Web3.utils.randomHex(2 * scheme.size);
  switch (scheme.type) {
    case "AttestationType":
      throw new Error("This should not be used")
    case "NumberLike":
      return toBN(rand);
    case "ChainType":
      throw new Error("This should not be used")
    case "BytesLike":
      return rand;
    default:
      // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
      ((_: never): void => { })(scheme.type);
  }
}

export function randReqItemCode(type: SupportedRequestType, size: number) {
  let rand = Web3.utils.randomHex(size);
  switch (type) {
    case "AttestationType":
      throw new Error("This should not be used")
    case "NumberLike":
      return `toBN(Web3.utils.randomHex(${size}))`;
    case "ChainType":
      throw new Error("This should not be used")
    case "BytesLike":
      return `Web3.utils.randomHex(${size})`;
    default:
      // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
      ((_: never): void => { })(type);
  }
}

export function assertEqualsByScheme(a: any, b: any, scheme: AttestationRequestScheme) {
  switch (scheme.type) {
    case "AttestationType":
      assert(a === b);
      return;
    case "NumberLike":
      assert(toBN(a).eq(toBN(b)));
      return;
    case "ChainType":
      assert(a === b);
      return;
    case "BytesLike":
      assert(a === b);
      return;
    default:
      // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
      ((_: never): void => { })(scheme.type);
  }
}

export function getAttestationTypeAndSource(bytes: string) {
  // TODO: make robust parsing.
  let input = unPrefix0x(bytes);
  if (!bytes || bytes.length < ATT_BYTES * 2 + CHAIN_ID_BYTES * 2) {
    return {
      attestationType: null,
      sourceId: null
    }
  }
  return {
    attestationType: toBN(prefix0x(input.slice(0, ATT_BYTES * 2))).toNumber() as AttestationType,
    sourceId: toBN(prefix0x(input).slice(ATT_BYTES * 2, ATT_BYTES * 2 + CHAIN_ID_BYTES * 2)).toNumber() as ChainType
  }
}

export function parseRequestBytesForDefinitions(
  bytes: string,
  definitions: AttestationTypeScheme[],
): ARType {
  let input = unPrefix0x(bytes)
  let attType = toBN(prefix0x(input.slice(0, ATT_BYTES * 2))).toNumber() as AttestationType;
  let scheme = definitions.find(definition => definition.id === attType);
  return parseRequestBytes(bytes, scheme);
}


// export function getAttestationTypeScheme(
//   bytes: string,
//   definitions: Map<AttestationType, AttestationTypeScheme>,
//   check = true
// ): AttestationTypeScheme | undefined {
//   let input = unPrefix0x(bytes)
//   let attType = toBN(prefix0x(input.slice(0, ATT_BYTES * 2))).toNumber() as AttestationType;
//   let definition = definitions.get(attType);
//   if (!definition) return undefined;  // scheme does not exist for the type
//   if (check) {
//     let len = definition.request.map(item => item.size).reduce((x, y) => x + y);
//     if (bytes.length !== len * 2) return undefined;  // not the correct number of bytes
//   }
//   return definition;
// }

// Assumes bytes length matches scheme
export function parseRequestBytes(bytes: string, scheme: AttestationTypeScheme): any {
  let result = {} as any;
  let input = unPrefix0x(bytes);
  let start = 0;
  for (let item of scheme.request) {
    let end = start + item.size * 2;
    if (end > bytes.length) {
      throw new AttestationRequestParseError("Incorrectly formated attestation request");
    }
    result[item.key] = fromUnprefixedBytes(input.slice(start, end), item);
    start = end;
  }
  return result;
}

export function encodeRequestBytes(request: any, scheme: AttestationTypeScheme, verify = true) {
  if (verify) {
    let schemeKeys = new Set<string>(scheme.request.map(item => item.key))
    let requestKeys = new Set<string>(Object.keys(request));
    if (schemeKeys.size != requestKeys.size) {
      throw new Error("Number of keys does not match")
    }
    for (let key in request) {
      if (!schemeKeys.has(key)) {
        throw new Error(`Non-matching key '${key}'`)
      }
    }
  }

  let bytes = "0x"
  scheme.request.forEach(item => {
    bytes += toUnprefixedBytes(request[item.key], item);
  })
  return bytes;
}

export function getSourceName(sourceId: number) {
  let name = MCC.getChainTypeName(sourceId);
  // in future check for "invalid" and then use other source name function for sourceId
  return name;
}

export function numberLikeToNumber(n: NumberLike): number {
  if (typeof n === "string") {
    return parseInt(n, 10);
  }
  return toNumber(n);
}

export function randomListElement<T>(list: T[]) {
  let randN = Math.floor(Math.random() * list.length);
  return list[randN];
}

export function randomWeightedChoice(choices: WeightedRandomChoice[]): string {
  let weightSum = choices.map(choice => choice.weight).reduce((a, b) => a + b);
  let randSum = Math.floor(Math.random() * (weightSum + 1));
  let tmpSum = 0;
  for (let choice of choices) {
    tmpSum += choice.weight;
    if (tmpSum >= randSum) return choice.name;
  }
}
