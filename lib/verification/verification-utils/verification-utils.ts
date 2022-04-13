import { TransactionBase } from "flare-mcc";
import { ConfirmedBlockQueryResponse, ConfirmedTransactionQueryResponse, ReferencedTransactionsQueryResponse } from "../../indexed-query-manager/indexed-query-manager-types";
import { IndexedQueryManager } from "../../indexed-query-manager/IndexedQueryManager";
import { VerificationStatus } from "../attestation-types/attestation-types";


export interface RecheckParams {
   recheck: boolean;
   blockNumber: number;
   numberOfConfirmations: number;
   roundId: number;
   dataAvailabilityProof: string;
   iqm: IndexedQueryManager;
}

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

// export function verifyIsAccountBased(fullTxData: TransactionBase<any, any>) {
//    if (fullTxData.sourceAddress.length !== 1) {
//       return VerificationStatus.NOT_SINGLE_SOURCE_ADDRESS;
//    }

//    if (fullTxData.receivingAddress.length !== 1) {
//       return VerificationStatus.NOT_SINGLE_DESTINATION_ADDRESS;
//    }

//    if (fullTxData.reference.length !== 1) {
//       return VerificationStatus.NOT_SINGLE_PAYMENT_REFERENCE;
//    }

//    return VerificationStatus.NEEDS_MORE_CHECKS;
// }

// export async function verifyConfirmationBlock(params: RecheckParams) {
//    if (params.recheck) {
//       let confirmationBlockIndex = params.blockNumber + params.numberOfConfirmations;
//       let confirmationBlock = await params.iqm.queryBlock({
//          blockNumber: confirmationBlockIndex,
//          roundId: params.roundId
//       });
//       if (!confirmationBlock) {
//          return VerificationStatus.NOT_CONFIRMED;
//       }
//       if (confirmationBlock.blockHash != params.dataAvailabilityProof) {
//          return VerificationStatus.WRONG_DATA_AVAILABILITY_PROOF;
//       }
//    }
//    return VerificationStatus.NEEDS_MORE_CHECKS;
// }

export function verifyNativePayment(fullTxData: TransactionBase<any, any>) {
   if (!fullTxData.isNativePayment) {
      return VerificationStatus.NOT_PAYMENT;
   }
   return VerificationStatus.NEEDS_MORE_CHECKS;
}
