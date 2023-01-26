import BN from "bn.js";
import { ARType } from "../generated/attestation-request-types";
import { SourceId } from "../sources/sources";

//////////////////////////////////////////////////////////////////////////////////////////////////////
// Verification status
//////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Enumerated verification status of attestation
 */
export enum VerificationStatus {
  // Successful verification
  OK = "OK",

  // Needs recheck
  // RECHECK_LATER = "RECHECK_LATER",

  // Temporary status during checks
  NEEDS_MORE_CHECKS = "NEEDS_MORE_CHECKS",

  // Source failure - source data is not up to date and does not allow consistent queries
  SYSTEM_FAILURE = "SYSTEM_FAILURE",

  // Error fields
  NOT_CONFIRMED = "NOT_CONFIRMED",

  NON_EXISTENT_TRANSACTION = "NON_EXISTENT_TRANSACTION",
  NON_EXISTENT_BLOCK = "NON_EXISTENT_BLOCK",
  NOT_PAYMENT = "NOT_PAYMENT",

  NON_EXISTENT_MINIMAL_BLOCK = "NON_EXISTENT_MINIMAL_BLOCK",

  REFERENCED_TRANSACTION_EXISTS = "REFERENCED_TRANSACTION_EXISTS",
  ZERO_PAYMENT_REFERENCE_UNSUPPORTED = "ZERO_PAYMENT_REFERENCE_UNSUPPORTED",

  PAYMENT_SUMMARY_ERROR = "PAYMENT_SUMMARY_ERROR",
}

/**
 * Interface for a verification of a request of type R with response of typo T.
 * The validity of the request is stored in status.
 */
export interface Verification<R, T> {
  hash?: string;
  request?: R;
  response?: T;
  rawResponse?: any;
  status: VerificationStatus;
}

export interface WeightedRandomChoice<T> {
  name: T;
  weight: number;
}
//////////////////////////////////////////////////////////////////////////////////////////////////////
// Encoding schemes
//////////////////////////////////////////////////////////////////////////////////////////////////////

export const ATT_BYTES = 2;
export const SOURCE_ID_BYTES = 4;
export const UTXO_BYTES = 1;
export const BLOCKNUMBER_BYTES = 4;
export const TIMESTAMP_BYTES = 4;
export const TIME_DURATION_BYTES = 4;
export const AMOUNT_BYTES = 16;
export const TX_ID_BYTES = 32;
export const MIC_BYTES = 32;
export const SOURCE_ADDRESS_KEY_BYTES = 32;
export const SOURCE_ADDRESS_CHEKSUM_BYTES = 4;
export const PAYMENT_REFERENCE_BYTES = 32;
export const XRP_ACCOUNT_BYTES = 20;

export type NumberLike = number | BN | string;
export type ByteSequenceLike = string;

export type SupportedSolidityType = "uint8" | "uint16" | "uint32" | "uint64" | "uint128" | "uint256" | "int256" | "bytes4" | "bytes32" | "bool" | "string";
export type SupportedRequestType = "ByteSequenceLike" | "NumberLike" | "AttestationType" | "SourceId";
export interface AttestationRequestScheme {
  key: string;
  size: number;
  type: SupportedRequestType;
  description?: string;
}

export interface DataHashScheme {
  key: string;
  type: SupportedSolidityType;
  description: string;
}
export interface AttestationTypeScheme {
  id: number;
  supportedSources: SourceId[];
  name: string;
  request: AttestationRequestScheme[];
  dataHashDefinition: DataHashScheme[];
}
export interface AttestationRequest {
  request: string;
}

export interface PrepareRequest {
  apiKey?: string;
  request: ARType;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////
// Message integrity code
//////////////////////////////////////////////////////////////////////////////////////////////////////
export const MIC_SALT = "Flare"