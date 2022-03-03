//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import BN from "bn.js";

export interface DHPayment {
   blockNumber: BN;
   blockTimestamp: BN;
   transactionHash: string;
   utxo: BN;
   sourceAddress: string;
   receivingAddress: string;
   paymentReference: BN;
   spentAmount: BN;
   receivedAmount: BN;
   oneToOne: boolean;
   status: BN;
}
export interface DHBalanceDecreasingTransaction {
   blockNumber: BN;
   blockTimestamp: BN;
   transactionHash: string;
   sourceAddress: string;
   spentAmount: BN;
   paymentReference: BN;
}
export interface DHBlockHeightExists {
   blockNumber: BN;
   blockTimestamp: BN;
}
export interface DHReferencedPaymentNonexistence {
   endTimestamp: BN;
   endBlock: BN;
   destinationAddress: string;
   paymentReference: BN;
   amount: BN;
   firstCheckedBlock: BN;
   firstCheckedBlockTimestamp: BN;
   firstOverflowBlock: BN;
   firstOverflowBlockTimestamp: BN;
}