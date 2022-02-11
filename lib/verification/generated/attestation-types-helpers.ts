
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
   id: BytesLike;
   dataAvailabilityProof: BytesLike
}

export interface ARBalanceDecreasingPayment {
   attestationType: AttestationType;
   chainId: ChainType;
   inUtxo: NumberLike;
   id: BytesLike;
   dataAvailabilityProof: BytesLike
}

export interface ARBlockHeightExistence {
   attestationType: AttestationType;
   chainId: ChainType;
   blockNumber: NumberLike;
   dataAvailabilityProof: BytesLike
}

export interface ARReferencedPaymentNonExistence {
   attestationType: AttestationType;
   chainId: ChainType;
   endTimestamp: NumberLike;
   endBlock: NumberLike;
   amount: NumberLike;
   paymentReference: NumberLike;
   dataAvailabilityProof: BytesLike
}
