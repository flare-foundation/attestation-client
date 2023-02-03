
export enum AttestationRoundPhase {
  collect,
  choose,
  commit,
  reveal,
  completed
}

// !!! STATUS ORDER IS IMPORTANT. It is crucial that the round can progress only to later status
// and not back
export enum AttestationRoundStatus {
  collecting,
  bitVotingClosed,
  chosen,
  commitDataPrepared,

  committed,
  revealed,

  error,
  processingTimeout
}
export const NO_VOTE = "0x00";
