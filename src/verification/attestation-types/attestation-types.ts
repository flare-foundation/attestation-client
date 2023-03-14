import BN from "bn.js";
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
 * DTO Object returned after attestation request verification.
 * If status is 'OK' then parameters @param hash, @param request and @param response appear
 * in the full response.
 */
export class Verification<R, T> {
  /**
   * Hash of the attestation as included in Merkle tree.
   */
  hash?: string;
  /**
   * Parsed attestation request.
   */
  request?: R;
  /**
   * Attestation response.
   */
  response?: T;
  /**
   * Verification status. 
   */
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
export class AttestationRequest {
  /**
   * Attestation request in hex string representing byte sequence as submitted to State Connector smart contract.
   */
  request: string;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////
// Message integrity code
//////////////////////////////////////////////////////////////////////////////////////////////////////
export const MIC_SALT = "Flare";
