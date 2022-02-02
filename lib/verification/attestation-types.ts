import BN from "bn.js";
import { AdditionalTransactionDetails, ChainType } from "flare-mcc";

export interface VerificationTestOptions {
  testFailProbability?: number;
  skipDataAvailabilityProof?: boolean;
}

export enum AttestationType {
  Payment = 1,
  BalanceDecreasingPayment = 2,
  BlockHeightExistence = 3,
}

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
  RECHECK_LATER = "RECHECK_LATER",
}

export interface NormalizedTransactionData extends AdditionalTransactionDetails {
  attestationType: AttestationType;
  chainId: BN;
  // verified: boolean;
  isFromOne?: boolean;
  verificationStatus: VerificationStatus;
  utxo?: BN;
  dataAvailabiltyProof?: string;  // for testing purposes
}

export interface DataAvailabilityProof {
  hash: string;
  blockNumber: number
}
export interface AttestationRequest {
  timestamp?: BN;
  instructions: BN;
  id: string;
  dataAvailabilityProof: string;
  attestationType?: AttestationType;
}

export interface TransactionAttestationRequest extends AttestationRequest {
  chainId: BN | number;
  blockNumber: BN | number;
  utxo?: BN | number;
  skipAvailabilityProofTest?: boolean
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

export const ATT_BITS = 32;
export const CHAIN_ID_BITS = 32;
export const UTXO_BITS = 8;

export function attestationTypeEncodingScheme(type: AttestationType) {
  switch (type) {
    case AttestationType.Payment:
      return {
        sizes: [ATT_BITS, CHAIN_ID_BITS, UTXO_BITS, 256 - ATT_BITS - CHAIN_ID_BITS - UTXO_BITS],
        keys: ["attestationType", "chainId", "utxo", ""],
        hashTypes: [
          "uint16",  // attestationType
          "uint16",  // chainId
          "uint64",  // blockNumber
          "uint64",  // blockTimestamp
          "bytes32", // txId

          "uint8",   // utxo
          "bytes32", // sourceAddress
          "bytes32", // destinationAddress
          "uint256", // paymentReference
          "uint256", // spent

          "uint256", // delivered
          "bool", // isFromOne
          "uint8", // status
        ],
        hashKeys: [
          "attestationType",
          "chainId",
          "blockNumber",
          "blockTimestamp",
          "txId",
          "utxo",
          "sourceAddresses",
          "destinationAddresses",
          "paymentReference",
          "spent",
          "delivered",
          "isFromOne",
          "status",
        ],
      };
    case AttestationType.BalanceDecreasingPayment:
      return {
        sizes: [ATT_BITS, CHAIN_ID_BITS, UTXO_BITS, 256 - ATT_BITS - CHAIN_ID_BITS - UTXO_BITS],
        keys: ["attestationType", "chainId", "inUtxo", ""],
        hashTypes: [
          "uint16", // attestationType
          "uint16", // chainId
          "uint64", // blockNumber
          "uint64", // blockTimestamp
          "bytes32", // txId
          "bytes32", // sourceAddress
          "uint256", // spent
        ],
        hashKeys: [
          "attestationType",
          "chainId",
          "blockNumber",
          "blockTimestamp",
          "txId",
          "sourceAddresses",
          "spent"
        ],
      };
    case AttestationType.BlockHeightExistence:
      return {
        sizes: [ATT_BITS, CHAIN_ID_BITS, 256 - ATT_BITS - CHAIN_ID_BITS],
        keys: ["attestationType", "chainId", ""],
        hashTypes: [
          "uint16", // attestationType
          "uint16", // chainId
          "uint64", // blockNumber
        ],
        hashKeys: [
          "attestationType",
          "chainId",
          "blockNumber"
        ],
      };

    default:
      throw new Error("Not yet implemented!");
  }
}
