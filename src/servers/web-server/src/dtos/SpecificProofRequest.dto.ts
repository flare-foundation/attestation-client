/**
 * Attestation request data.
 */
export class SpecificProofRequest {
  /**
   * Round of the attestation request submission
   */
  roundId: number;
  /**
   * Attestation request data as submitted to State Connector smart contract
   */
  callData: string;
}
