export enum AttestationStatus {
  ///// IN PROCESSING STATUSES ///////
  initial,  // initial status
  queued,
  processing,
  

  ///// FINAL STATUSES //////
  failed,   // problem on attestation client side due to configuration or no expected response from verifier
  valid,    // verified successfully and valid
  invalid,  // rejected (not due to error but due to non-existence/non-matching the attestation type rules)
  tooLate,  // transaction started being processed too late
  overLimit,  // transaction is over globelly defined limit, hence rejected
  error,  // some kind of a error when dealing with verifier or indeterminate result from verifier
}

export enum SummarizedAttestationStatus {
  valid,
  invalid,
  indeterminate
}

export function getSummarizedAttestationStatus(status: AttestationStatus): SummarizedAttestationStatus {
  switch (status) {
    case AttestationStatus.valid:
      return SummarizedAttestationStatus.valid;
    case AttestationStatus.queued:
    case AttestationStatus.processing:
    case AttestationStatus.initial:
    case AttestationStatus.error:
    case AttestationStatus.failed:
    case AttestationStatus.tooLate:
      return SummarizedAttestationStatus.indeterminate;
    case AttestationStatus.overLimit:
    case AttestationStatus.invalid:
      return SummarizedAttestationStatus.invalid;
    default:
      // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
      ((_: never): void => { })(status);
  }
}
