import { TransactionBase } from "flare-mcc";
import { ConfirmedBlockQueryResponse, ConfirmedTransactionQueryResponse, ReferencedTransactionsQueryResponse } from "../../indexed-query-manager/indexed-query-manager-types";
import { IndexedQueryManager } from "../../indexed-query-manager/IndexedQueryManager";
import { VerificationStatus } from "../attestation-types/attestation-types";



export interface VerificationResponse<T> {
   status: VerificationStatus;
   response?: T;
}

//////////////////////////////////////////////////
// Implementations of generic functions for error 
// handling
//////////////////////////////////////////////////

export function verifyWorkflowForTransaction(result: ConfirmedTransactionQueryResponse) {
   if (result.status === 'RECHECK') {
      return VerificationStatus.RECHECK_LATER;
   }

   if (result.status === 'NOT_EXIST' || result.status === "NO_BOUNDARY" || !result.transaction) {
      return VerificationStatus.NON_EXISTENT_TRANSACTION;
   }

   if(result.status === "SYSTEM_FAILURE") {
      return VerificationStatus.SYSTEM_FAILURE;
   }

   return VerificationStatus.NEEDS_MORE_CHECKS;
}


export function verifyWorkflowForBlock(result: ConfirmedBlockQueryResponse) {
   if (result.status === "RECHECK") {
      return VerificationStatus.RECHECK_LATER;
   }

   if (result.status === "NOT_EXIST" || result.status === "NO_BOUNDARY" || !result.block) {
      return VerificationStatus.NON_EXISTENT_BLOCK;
   }

   if(result.status === "SYSTEM_FAILURE") {
      return VerificationStatus.SYSTEM_FAILURE;
   }

   return VerificationStatus.NEEDS_MORE_CHECKS;
}

export function verifyWorkflowForReferencedTransactions(result: ReferencedTransactionsQueryResponse) {
   if (result.status === "RECHECK") {
      return VerificationStatus.RECHECK_LATER;
   }

   if (result.status === "NO_OVERFLOW_BLOCK" || result.status === "NO_BOUNDARY" || !result.firstOverflowBlock) {
      return VerificationStatus.NON_EXISTENT_BLOCK;
   }

   if(result.status === "SYSTEM_FAILURE") {
      return VerificationStatus.SYSTEM_FAILURE;
   }

   return VerificationStatus.NEEDS_MORE_CHECKS;
}

export function verifyNativePayment(fullTxData: TransactionBase<any, any>) {
   if (!fullTxData.isNativePayment) {
      return VerificationStatus.NOT_PAYMENT;
   }
   return VerificationStatus.NEEDS_MORE_CHECKS;
}
