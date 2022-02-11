import assert from "assert";
import BN from "bn.js";
import { AdditionalTransactionDetails, ChainType, prefix0x, unPrefix0x } from "flare-mcc";
import { toBN } from "web3-utils";
import { toHex } from "../../utils/utils";
import { AttestationType } from "../generated/attestation-types-enum";

export enum VerificationStatus {
  OK = "OK",
  NOT_CONFIRMED = "NOT_CONFIRMED",
  NOT_SINGLE_SOURCE_ADDRESS = "NOT_SINGLE_SOURCE_ADDRESS",
  NOT_SINGLE_DESTINATION_ADDRESS = "NOT_SINGLE_DESTINATION_ADDRESS",
  UNSUPPORTED_SOURCE_ADDRESS = "UNSUPPORTED_SOURCE_ADDRESS",
  UNSUPPORTED_DESTINATION_ADDRESS = "UNSUPPORTED_DESTINATION_ADDRESS",
  WRONG_IN_UTXO = "WRONG_IN_UTXO",
  MISSING_IN_UTXO = "MISSING_IN_UTXO",
  WRONG_OUT_UTXO = "WRONG_OUT_UTXO",
  MISSING_OUT_UTXO = "MISSING_OUT_UTXO",
  EMPTY_IN_ADDRESS = "EMPTY_IN_ADDRESS",
  EMPTY_OUT_ADDRESS = "EMPTY_OUT_ADDRESS",
  // MISSING_SOURCE_ADDRESS_HASH = "MISSING_SOURCE_ADDRESS_HASH",
  // SOURCE_ADDRESS_DOES_NOT_MATCH = "SOURCE_ADDRESS_DOES_NOT_MATCH",
  INSTRUCTIONS_DO_NOT_MATCH = "INSTRUCTIONS_DO_NOT_MATCH",
  WRONG_DATA_AVAILABILITY_PROOF = "WRONG_DATA_AVAILABILITY_PROOF",
  WRONG_DATA_AVAILABILITY_HEIGHT = "WRONG_DATA_AVAILABILITY_HEIGHT",
  DATA_AVAILABILITY_PROOF_REQUIRED = "DATA_AVAILABILITY_PROOF_REQUIRED",
  FORBIDDEN_MULTISIG_SOURCE = "FORBIDDEN_MULTISIG_SOURCE",
  FORBIDDEN_MULTISIG_DESTINATION = "FORBIDDEN_MULTISIG_DESTINATION",
  FORBIDDEN_SELF_SENDING = "FORBIDDEN_SELF_SENDING",
  FUNDS_UNCHANGED = "FUNDS_UNCHANGED",
  FUNDS_INCREASED = "FUNDS_INCREASED",
  // COINBASE_TRANSACTION = "COINBASE_TRANSACTION",
  UNSUPPORTED_TX_TYPE = "UNSUPPORTED_TX_TYPE",
  NON_EXISTENT_TRANSACTION = "NON_EXISTENT_TRANSACTION",
  NON_EXISTENT_BLOCK = "NON_EXISTENT_BLOCK",
  BLOCKHASH_DOES_NOT_EXIST = "BLOCK_DOES_NOT_EXIST",
  RECHECK_LATER = "RECHECK_LATER",
}

export interface AttestationRequest {
  timestamp?: BN;
  instructions: BN;
  id: string;
  dataAvailabilityProof: string;
  // optional fields to which the result gets parsed
  attestationType?: AttestationType;
  chainId?: BN | number;
}
export interface VerificationResult extends AttestationRequest {
  verificationStatus: VerificationStatus;
}
export interface ChainVerification extends AdditionalTransactionDetails, VerificationResult {
  isFromOne?: boolean;
  utxo?: BN;
}

export interface DataAvailabilityProof {
  hash?: string;
  blockNumber?: number;
}

export interface TransactionAttestationRequest extends AttestationRequest {
  blockNumber: BN | number;
  utxo?: BN | number;
}

export interface VerifiedAttestation {
  chainType: ChainType;
  attestType: AttestationType;
  txResponse?: any;
  blockResponse?: any;
  sender?: string;
  utxo?: number;
  fee?: BN;
  spent?: BN;
  delivered?: BN;
}

export interface AttestationTypeEncoding {
  sizes: number[];
  keys: string[];
  hashTypes: string[];
  hashKeys: string[];
}

export interface VerificationTestOptions {
  testFailProbability?: number;
  skipDataAvailabilityProof?: boolean;
}

export const ATT_BYTES = 2;
export const CHAIN_ID_BYTES = 2;
export const UTXO_BYTES = 1;
export const BLOCKNUMBER_BYTES = 4;
export const TIMESTAMP_BYTES = 4;
export const AMOUNT_BYTES = 16;
export const TX_ID_BYTES = 32;
export const DATA_AVAILABILITY_BYTES = 32;
export const SOURCE_ADDRESS_KEY_BYTES = 32;
export const SOURCE_ADDRESS_CHEKSUM_BYTES = 4;
export const PAYMENT_REFERENCE_BYTES = 32;

export type NumberLike = number | BN | string;
export type BytesLike = string;

export interface AttestationRequestScheme {
  key: string;
  size: number;
  type: "BytesLike" | "NumberLike" | "AttestationType" | "ChainType";
}

export interface DataHashScheme {
  key: string;
  type: "uint8" | "uint16" | "uint32" | "uint64" | "uint128" | "uint256" | "int256" | "bytes4" | "bytes32" | "bool"
}

export interface AttestationTypeScheme {
  id: number;
  name: string;
  request: AttestationRequestScheme[];
  dataHashDefinition: DataHashScheme[];
}

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
function fromUnprefixedBuytes(bytes: string, scheme: AttestationRequestScheme) {
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
      return unPrefix0x(toHex(value as number, scheme.size*2));
    case "NumberLike":
      return unPrefix0x(toHex(value, scheme.size*2));
    case "ChainType":
      return unPrefix0x(toHex(value as number, scheme.size*2));
    case "BytesLike":
      return unPrefix0x(toHex(value, scheme.size*2));
    default:
      // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
      ((_: never): void => { })(scheme.type);
  }
}


export function getAttestationTypeAndSource(bytes: string) {
  let input = unPrefix0x(bytes);
  return {
    attestationType: toBN(prefix0x(input.slice(0, ATT_BYTES * 2))).toNumber() as AttestationType,
    source: toBN(prefix0x(input).slice(ATT_BYTES * 2, ATT_BYTES * 2 + CHAIN_ID_BYTES * 2)).toNumber() as ChainType
  }
}

export function getAttestationTypeScheme(
  bytes: string,
  definitions: Map<AttestationType, AttestationTypeScheme>,
  check = true
): AttestationTypeScheme | undefined {
  let input = unPrefix0x(bytes)
  let attType = toBN(prefix0x(input.slice(0, ATT_BYTES * 2))).toNumber() as AttestationType;
  let definition = definitions.get(attType);
  if (!definition) return undefined;  // scheme does not exist for the type
  if (check) {
    let len = definition.request.map(item => item.size).reduce((x, y) => x + y);
    if (bytes.length !== len * 2) return undefined;  // not the correct number of bytes
  }
  return definition;
}

// Assumes bytes length matches scheme
export function parseRequestBytes(bytes: string, scheme: AttestationTypeScheme): any {
  let result = {} as any;
  let input = unPrefix0x(bytes);
  let start = 0;
  for (let item of scheme.request) {
    let end = start + item.size*2;
    result[item.key] = fromUnprefixedBuytes(input.slice(start, end), item)
  }
  return result;
}

export function encodeRequestBytes(request: any, scheme: AttestationTypeScheme, verify=true) {
  if(verify) {
    let schemeKeys = new Set<string>(scheme.request.map(item => item.key))
    let requestKeys = new Set<string>(Object.keys(request));
    if(schemeKeys.size != requestKeys.size) {
      throw new Error("Number of keys does not match")
    }
    for(let key in request) {
      if(!schemeKeys.has(key)) {
        throw new Error(`Non-matching key '${key}'`)
      }
    }
  }
  
  let 
}

// export function attestationTypeEncodingScheme(type: AttestationType) {
//   switch (type) {
//     case AttestationType.Payment:
//       return {
//         sizes: [ATT_BYTES, CHAIN_ID_BYTES, UTXO_BYTES, TX_ID_BYTES, DATA_AVAILABILITY_BYTES],
//         keys: ["attestationType", "chainId", "utxo", "id", "dataAvailabilityProof"],
//         hashTypes: [
//           "uint16", // attestationType
//           "uint16", // chainId
//           "uint64", // blockNumber
//           "uint64", // blockTimestamp
//           "bytes32", // txId
//           "uint8", // utxo
//           "bytes32", // sourceAddress
//           "bytes4",  // sourceAddress checksum
//           "bytes32", // destinationAddress
//           "bytes4",  // destinationAddress checksum
//           "bytes32", // paymentReference
//           "uint256", // spent
//           "uint256", // delivered
//           "bool", // isToOne
//           "uint8", // status
//         ],
//         hashKeys: [
//           "attestationType",
//           "chainId",
//           "blockNumber",
//           "blockTimestamp",
//           "txId",
//           "utxo",
//           "sourceAddress",
//           "sourceAddressChecksum",
//           "destinationAddress",
//           "destinationAddressChecksum",
//           "paymentReference",
//           "spent",
//           "delivered",
//           "isToOne",
//           "status",
//         ],
//       };
//     case AttestationType.BalanceDecreasingPayment:
//       return {
//         sizes: [ATT_BYTES, CHAIN_ID_BYTES, UTXO_BYTES, TX_ID_BYTES, DATA_AVAILABILITY_BYTES],
//         keys: ["attestationType", "chainId", "inUtxo", "id", "dataAvailabilityProof"],
//         hashTypes: [
//           "uint16", // attestationType
//           "uint16", // chainId
//           "uint64", // blockNumber
//           "uint64", // blockTimestamp
//           "bytes32", // txId
//           "bytes32", // sourceAddress
//           "bytes4", // sourceAddress checksum
//           "int256", // spent
//         ],
//         hashKeys: [
//           "attestationType",
//           "chainId",
//           "blockNumber",
//           "blockTimestamp",
//           "txId",
//           "sourceAddress",
//           "sourceAddressChecksum",
//           "spent"
//         ],
//       };
//     case AttestationType.BlockHeightExistence:
//       return {
//         sizes: [ATT_BYTES, CHAIN_ID_BYTES, BLOCKNUMBER_BYTES, DATA_AVAILABILITY_BYTES],
//         keys: ["attestationType", "chainId", "blockNumber", "dataAvailabilityProof"],
//         hashTypes: [
//           "uint16", // attestationType
//           "uint16", // chainId
//           "uint64", // blockNumber
//           "bytes32", // blockHash
//         ],
//         hashKeys: [
//           "attestationType",
//           "chainId",
//           "blockNumber",
//           "blockHash"
//         ],
//       };
//     case AttestationType.ReferencedPaymentNonExistence:
//       return {
//         sizes: [ATT_BYTES, CHAIN_ID_BYTES, TIMESTAMP_BYTES, BLOCKNUMBER_BYTES, AMOUNT_BYTES, PAYMENT_REFERENCE_BYTES, DATA_AVAILABILITY_BYTES],
//         keys: ["attestationType", "chainId", "endTimestamp", "endBlock", "amount", "paymentReference", "dataAvailabilityProof"],
//         hashTypes: [
//           "uint16", // attestationType
//           "uint16", // chainId
//           "uint64", // endTimestamp
//           "uint64", // endBlock
//           "bytes32", // paymentReference
//           "uint128", // amount
//           "uint64", // firstCheckedBlock
//           "uint64", // firstCheckedBlockTimestamp
//           "uint64", // firstOverflowBlock
//           "uint64", // firstOverflowBlockTimestamp
//         ],
//         hashKeys: [
//           "attestationType",
//           "chainId",
//           "endTimestamp",
//           "endBlock",
//           "paymentReference",
//           "amount",
//           "firstCheckedBlock",
//           "firstCheckedBlockTimestamp",
//           "firstOverflowBlock",
//           "firstOverflowBlockTimestamp",
//         ],
//       };
//     default:
//       throw new Error("Not yet implemented!");
//   }
// }
