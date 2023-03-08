export enum AttestationRoundPhase {
  collect,
  choose,
  commit,
  reveal,
  finalise,
}

// !!! STATUS ORDER IS IMPORTANT. It is crucial that the round can progress only to later status
// and not back
export enum AttestationRoundStatus {
  collecting,
  bitVotingClosed,   // choose phase is finished and at least one block with bigger timestamp is mined or enough time has passed
  chosen, // bit voting result calculated
  commitDataPrepared, // commit data (Merkle tree) calculated based on bit voting result

  committed, // receipt for submitAttestation which committed the commit data has been received
  revealed, // receipt for submitAttestation which revealed the data has been received

  error,
  processingTimeout,
}
export const NO_VOTE = "0x00";
