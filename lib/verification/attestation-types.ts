import BN from "bn.js";
import { AdditionalTransactionDetails, ChainType } from "../MCC/types";

export interface VerificationTestOptions {
  testFailProbability?: number;
  getAvailabilityProof?: boolean;
}

export enum AttestationType {
    FassetPaymentProof = 1,
    BalanceDecreasingProof = 2
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
    EMPTY_IN_ADDRESS = "EMPTY_IN_ADDRESS",
    EMPTY_OUT_ADDRESS = "EMPTY_OUT_ADDRESS",
    // MISSING_SOURCE_ADDRESS_HASH = "MISSING_SOURCE_ADDRESS_HASH",
    // SOURCE_ADDRESS_DOES_NOT_MATCH = "SOURCE_ADDRESS_DOES_NOT_MATCH",
    INSTRUCTIONS_DO_NOT_MATCH = "INSTRUCTIONS_DO_NOT_MATCH",
    WRONG_DATA_AVAILABILITY_PROOF = "WRONG_DATA_AVAILABILITY_PROOF",
    DATA_AVAILABILITY_PROOF_REQUIRED = "DATA_AVAILABILITY_PROOF_REQUIRED",
    FORBIDDEN_MULTISIG_SOURCE = "FORBIDDEN_MULTISIG_SOURCE",
    FORBIDDEN_MULTISIG_DESTINATION = "FORBIDDEN_MULTISIG_DESTINATION",
    FORBIDDEN_SELF_SENDING = "FORBIDDEN_SELF_SENDING",
    FUNDS_UNCHANGED = "FUNDS_UNCHANGED",
    FUNDS_INCREASED = "FUNDS_INCREASED",
    // COINBASE_TRANSACTION = "COINBASE_TRANSACTION",
    UNSUPPORTED_TX_TYPE = "UNSUPPORTED_TX_TYPE",
    RECHECK_LATER = "RECHECK_LATER",
  }
  
  export interface NormalizedTransactionData extends AdditionalTransactionDetails {
    attestationType: AttestationType;
    chainId: BN;
    verified: boolean;
    verificationStatus: VerificationStatus;
    utxo?: BN;
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
    case AttestationType.FassetPaymentProof:
      return {
        sizes: [ATT_BITS, CHAIN_ID_BITS, UTXO_BITS, 256 - ATT_BITS - CHAIN_ID_BITS - UTXO_BITS],
        keys: ["attestationType", "chainId", "utxo", ""],
        hashTypes: [
          "uint32", // type
          "uint64", // chainId
          "uint64", // blockNumber
          "bytes32", // txId
          // "uint8", // utxo
          "bytes32", // sourceAddress
          "bytes32", // destinationAddress
          "uint256", // destinationTag
          "uint256", // spent
          "uint256", // delivered
          "uint256", // fee
          "uint8", // status
        ],
        hashKeys: [
          "attestationType",
          "chainId",
          "blockNumber",
          "txId",
          // "utxo",
          "sourceAddresses",
          "destinationAddresses",
          "destinationTag",
          "spent",
          "delivered",
          "fee",
          "status",
        ],
      };
    case AttestationType.BalanceDecreasingProof:
      return {
        sizes: [ATT_BITS, CHAIN_ID_BITS, UTXO_BITS, 256 - ATT_BITS - CHAIN_ID_BITS - UTXO_BITS],
        keys: ["attestationType", "chainId", "utxo", ""],
        hashTypes: [
          "uint32", // type
          "uint64", // chainId
          "uint64", // blockNumber
          "bytes32", // txId
          "bytes32", // sourceAddress
          "uint256", // spent
        ],
        hashKeys: [
          "attestationType", 
          "chainId", 
          "blockNumber", 
          "txId", 
          "sourceAddresses", 
          "spent"
        ],
      };

    default:
      throw new Error("Not yet implemented!");
  }
}
