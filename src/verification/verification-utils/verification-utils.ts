import { AlgoTransaction, BtcTransaction, DogeTransaction, LtcTransaction, XrpTransaction } from "@flarenetwork/mcc";
import {
  ConfirmedBlockQueryResponse, ConfirmedTransactionQueryResponse,
  ConfirmedTransactionQueryStatusType,
  ReferencedTransactionsQueryResponse
} from "../../indexed-query-manager/indexed-query-manager-types";
import { VerificationStatus } from "../attestation-types/attestation-types";

export type MccTransactionType = BtcTransaction | LtcTransaction | DogeTransaction | XrpTransaction | AlgoTransaction;
export interface VerificationResponse<T> {
  status: VerificationStatus;
  response?: T;
}

//////////////////////////////////////////////////
// Implementations of generic functions for error
// handling. Used in verification functions in
// `generic-chain-verification.ts`
//////////////////////////////////////////////////

export function verifyWorkflowForTransaction(result: ConfirmedTransactionQueryResponse): VerificationStatus {
  switch (result.status) {
    case "OK":
      return VerificationStatus.NEEDS_MORE_CHECKS;   
    case "NOT_EXIST":
      return VerificationStatus.NON_EXISTENT_TRANSACTION;
    default:
      // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
      ((_: never): void => {})(result.status);
  }
}

export function verifyWorkflowForBlockAvailability(result: ConfirmedBlockQueryResponse): VerificationStatus {
  switch (result.status) {
    case "OK":
      return VerificationStatus.NEEDS_MORE_CHECKS;   
    case "NOT_EXIST":
      return VerificationStatus.DATA_AVAILABILITY_ISSUE;
    default:
      // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
      ((_: never): void => {})(result.status);
  }
}


export function verifyWorkflowForBlock(result: ConfirmedBlockQueryResponse): VerificationStatus  {
  switch (result.status) {
    case "OK":
      return VerificationStatus.NEEDS_MORE_CHECKS;   
    case "NOT_EXIST":
      return VerificationStatus.NON_EXISTENT_BLOCK;;
    default:
      // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
      ((_: never): void => {})(result.status);
  }
}

export function verifyWorkflowForReferencedTransactions(result: ReferencedTransactionsQueryResponse): VerificationStatus {
  switch (result.status) {
    case "OK":
      return VerificationStatus.NEEDS_MORE_CHECKS;   
    case "NO_OVERFLOW_BLOCK":
    case "DATA_AVAILABILITY_FAILURE":
      return VerificationStatus.DATA_AVAILABILITY_ISSUE;;
    default:
      // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
      ((_: never): void => {})(result.status);
  }
}
