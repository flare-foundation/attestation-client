import { AttestationResponseStatus } from "../../external-libs/AttestationResponse";

//////////////////////////////////////////////////////////////////////////////////////////////////////
// Verification status
//////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Enumerated verification status of attestation
 */
export enum VerificationStatus {
  ///////////////////////////
  // VALID STATUS
  ///////////////////////////

  OK = "OK",

  ///////////////////////////
  // INDETERMINATE STATUSES
  ///////////////////////////

  DATA_AVAILABILITY_ISSUE = "DATA_AVAILABILITY_ISSUE",
  // Temporary status during checks
  NEEDS_MORE_CHECKS = "NEEDS_MORE_CHECKS",
  // Source failure - error in checking
  SYSTEM_FAILURE = "SYSTEM_FAILURE",

  NON_EXISTENT_BLOCK = "NON_EXISTENT_BLOCK",

  ///////////////////////////
  // ERROR STATUSES
  ///////////////////////////

  // generic invalid response
  NOT_CONFIRMED = "NOT_CONFIRMED",

  NON_EXISTENT_TRANSACTION = "NON_EXISTENT_TRANSACTION",

  NOT_PAYMENT = "NOT_PAYMENT",

  REFERENCED_TRANSACTION_EXISTS = "REFERENCED_TRANSACTION_EXISTS",
  ZERO_PAYMENT_REFERENCE_UNSUPPORTED = "ZERO_PAYMENT_REFERENCE_UNSUPPORTED",
  NOT_STANDARD_PAYMENT_REFERENCE = "NOT_STANDARD_PAYMENT_REFERENCE",
  PAYMENT_SUMMARY_ERROR = "PAYMENT_SUMMARY_ERROR",
}

/**
 * Summarized verification status into three options.
 */
export enum SummarizedVerificationStatus {
  valid,
  invalid,
  indeterminate,
}

/**
 * Given a VerificationStatus status it returns the corresponding SummarizedValidationStatus
 * @param status
 * @returns
 */
export function getSummarizedVerificationStatus(status: VerificationStatus): SummarizedVerificationStatus {
  switch (status) {
    case VerificationStatus.OK:
      return SummarizedVerificationStatus.valid;
    case VerificationStatus.DATA_AVAILABILITY_ISSUE:
    case VerificationStatus.NEEDS_MORE_CHECKS:
    case VerificationStatus.SYSTEM_FAILURE:
    case VerificationStatus.NON_EXISTENT_BLOCK:
      return SummarizedVerificationStatus.indeterminate;
    case VerificationStatus.NOT_CONFIRMED:
    case VerificationStatus.NON_EXISTENT_TRANSACTION:
    case VerificationStatus.NOT_PAYMENT:
    case VerificationStatus.REFERENCED_TRANSACTION_EXISTS:
    case VerificationStatus.ZERO_PAYMENT_REFERENCE_UNSUPPORTED:
    case VerificationStatus.NOT_STANDARD_PAYMENT_REFERENCE:
    case VerificationStatus.PAYMENT_SUMMARY_ERROR:
      return SummarizedVerificationStatus.invalid;
  }
  // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
  ((_: never): void => {})(status);
}

export function getAttestationStatus(status: VerificationStatus): AttestationResponseStatus {
  switch (status) {
    case VerificationStatus.OK:
      return AttestationResponseStatus.VALID;
    case VerificationStatus.DATA_AVAILABILITY_ISSUE:
    case VerificationStatus.NEEDS_MORE_CHECKS:
    case VerificationStatus.SYSTEM_FAILURE:
    case VerificationStatus.NON_EXISTENT_BLOCK:
      return AttestationResponseStatus.INDETERMINATE;
    case VerificationStatus.NOT_CONFIRMED:
    case VerificationStatus.NON_EXISTENT_TRANSACTION:
    case VerificationStatus.NOT_PAYMENT:
    case VerificationStatus.REFERENCED_TRANSACTION_EXISTS:
    case VerificationStatus.ZERO_PAYMENT_REFERENCE_UNSUPPORTED:
    case VerificationStatus.NOT_STANDARD_PAYMENT_REFERENCE:
    case VerificationStatus.PAYMENT_SUMMARY_ERROR:
      return AttestationResponseStatus.INVALID;
  }
  // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
  ((_: never): void => {})(status);
}


export interface WeightedRandomChoice<T> {
  name: T;
  weight: number;
}
