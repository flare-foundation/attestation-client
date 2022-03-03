//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { ChainType } from "flare-mcc";
import { BytesLike, NumberLike } from "../attestation-types/attestation-types";
import { AttestationType } from "./attestation-types-enum";

export interface ARPayment {
   attestationType: AttestationType;
   chainId: ChainType;
   utxo: NumberLike;
   inUtxo: NumberLike;
   id: BytesLike;
   dataAvailabilityProof: BytesLike;
}
export interface ARBalanceDecreasingTransaction {
   attestationType: AttestationType;
   chainId: ChainType;
   inUtxo: NumberLike;
   id: BytesLike;
   dataAvailabilityProof: BytesLike;
}
export interface ARBlockHeightExists {
   attestationType: AttestationType;
   chainId: ChainType;
   blockNumber: NumberLike;
   dataAvailabilityProof: BytesLike;
}
export interface ARReferencedPaymentNonexistence {
   attestationType: AttestationType;
   chainId: ChainType;
   endTimestamp: NumberLike;
   endBlock: NumberLike;
   destinationAddress: BytesLike;
   amount: NumberLike;
   paymentReference: NumberLike;
   dataAvailabilityProof: BytesLike;
}