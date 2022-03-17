//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { ChainType } from "flare-mcc";
import { BytesLike, NumberLike } from "../attestation-types/attestation-types";
import { AttestationType } from "./attestation-types-enum";

export interface ARPayment {
   // Attestation type id for this request, see AttestationType enum.
   attestationType: AttestationType;

   // The ID of the underlying chain, see ChainType enum.
   chainId: ChainType;

   // Number of the block of the transaction.
   blockNumber: NumberLike;

   // Index of the receivingAddress on utxo chains.
   utxo: NumberLike;

   // Index of the sourceAddress on utxo chains.
   inUtxo: NumberLike;

   // Transaction hash to search for.
   id: BytesLike;

   // Block hash of the finalization block for the searched transaction (e.g. at least 6 blocks after the block with transaction).
   dataAvailabilityProof: BytesLike;
}

export interface ARBalanceDecreasingTransaction {
   // Attestation type id for this request, see AttestationType enum.
   attestationType: AttestationType;

   // The ID of the underlying chain, see ChainType enum.
   chainId: ChainType;

   // Number of the block of the transaction.
   blockNumber: NumberLike;

   // Index of the sourceAddress on utxo chains.
   inUtxo: NumberLike;

   // Transaction hash to search for.
   id: BytesLike;

   // Block hash of the finalization block for the searched transaction (e.g. at least 6 blocks after the block with transaction).
   dataAvailabilityProof: BytesLike;
}

export interface ARConfirmedBlockHeightExists {
   // Attestation type id for this request, see AttestationType enum.
   attestationType: AttestationType;

   // The ID of the underlying chain, see ChainType enum.
   chainId: ChainType;

   // Number of the block to prove the existence of.
   blockNumber: NumberLike;

   // Hash of the block to prove the existence of.
   dataAvailabilityProof: BytesLike;
}

export interface ARReferencedPaymentNonexistence {
   // Attestation type id for this request, see AttestationType enum.
   attestationType: AttestationType;

   // The ID of the underlying chain, see ChainType enum.
   chainId: ChainType;

   // Start block number for searching the transaction.
   startBlock: NumberLike;

   // Maximum median timestamp of the block where the transaction is searched for.
   endTimestamp: NumberLike;

   // Maximum number of the block where the transaction is searched for.
   endBlock: NumberLike;

   // Payment nonexistence is confirmed if there is no payment transaction (attestation of `Payment` type)
   // with correct `(destinationAddress, paymentReference, amount)` combination
   // and with transaction status 0 (success) or 2 (failure, receiver's fault). 
   // Note: if there exist only payment(s) with status 1 (failure, sender's fault) 
   // then payment nonexistence is still confirmed.
   destinationAddress: BytesLike;

   // The exact amount to search for.
   amount: NumberLike;

   // The payment reference to search for.
   paymentReference: BytesLike;

   // Number of the overflow block - the block which has `block.timestamp > endTimestamp` and `block.blockNumber > endBlock`.
   // Does not need to be the first such block. It has to be confirmed.
   overflowBlock: NumberLike;

   // Block hash of the confirmation data availability block for the overflow block.
   dataAvailabilityProof: BytesLike;
}
export type ARType = ARPayment | ARBalanceDecreasingTransaction | ARConfirmedBlockHeightExists | ARReferencedPaymentNonexistence;