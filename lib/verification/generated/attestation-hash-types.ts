
//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import BN from "bn.js";

export interface DHPayment {
   attestationType: BN;
   chainId: BN;
   blockNumber: BN;
   blockTimestamp: BN;
   txId: string;
   utxo: BN;
   sourceAddress: string;
   destinationAddress: string;
   paymentReference: BN;
   spent: BN;
   delivered: BN;
   isToOne: boolean;
   status: BN;
}
export interface DHBalanceDecreasingPayment {
   attestationType: BN;
   chainId: BN;
   blockNumber: BN;
   blockTimestamp: BN;
   txId: string;
   sourceAddress: string;
   spent: BN;
}
export interface DHBlockHeightExistence {
   attestationType: BN;
   chainId: BN;
   blockNumber: BN;
   blockTimestamp: BN;
   blockHash: string;
}
export interface DHReferencedPaymentNonExistence {
   attestationType: BN;
   chainId: BN;
   endTimestamp: BN;
   endBlock: BN;
   paymentReference: BN;
   amount: BN;
   firstCheckedBlockTimestamp: BN;
   firstCheckedBlock: BN;
   firstOverflowBlockTimestamp: BN;
   firstOverflowBlock: BN;
}