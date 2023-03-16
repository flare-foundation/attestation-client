export enum AttestationStatus {
  ///// IN PROCESSING STATUSES ///////
  queued,
  processing,
  undetermined,

  ///// FINAL STATUSES //////
  failed,
  valid,
  invalid,
  tooLate,
  overLimit,
  error,
}
