import BN from "bn.js";
import { ChainType } from "flare-mcc";
import { AttestationType } from "../generated/attestation-types-enum";

//////////////////////////////////////////////////////////////////////////////////////////////////////
// Verification status
//////////////////////////////////////////////////////////////////////////////////////////////////////

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

export interface Verification<T> {
  hash?: string;
  response?: T
  status: VerificationStatus;
}

export interface AdditionalTransactionDetails {
  
}

export interface ChainVerification extends AdditionalTransactionDetails , VerificationResult {
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

//////////////////////////////////////////////////////////////////////////////////////////////////////
// Encoding schemes
//////////////////////////////////////////////////////////////////////////////////////////////////////

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

export type SupportedSolidityType = "uint8" | "uint16" | "uint32" | "uint64" | "uint128" | "uint256" | "int256" | "bytes4" | "bytes32" | "bool" | "string";
export type SupportedRequestType = "BytesLike" | "NumberLike" | "AttestationType" | "ChainType";
export interface AttestationRequestScheme {
  key: string;
  size: number;
  type: SupportedRequestType;
}

export interface DataHashScheme {
  key: string;
  type: SupportedSolidityType;
  description: string;
}

type AttestationSource = ChainType  // Other source types may be added.
export interface AttestationTypeScheme {
  id: number;
  supportedSources: AttestationSource[];
  name: string;
  request: AttestationRequestScheme[];
  dataHashDefinition: DataHashScheme[];
}

export interface IndexerQueryHandler {

}
