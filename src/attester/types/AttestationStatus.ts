
export enum AttestationStatus {
  ///// IN PROCESSING STATUSES ///////
  queued,
  processing,

  ///// FINAL STATUSES //////
  failed,
  valid,
  invalid,
  tooLate,
  overLimit,
  error
}
