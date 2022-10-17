export interface VotingRoundRequest {
  roundId: number;
  requestBytes: string;
  verificationStatus: string;
  attestationStatus?: string;
  exceptionError?: string;
}
