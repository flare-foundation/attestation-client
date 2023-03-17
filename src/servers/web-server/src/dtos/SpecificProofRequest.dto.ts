import { IsHexadecimal, IsInt } from "class-validator";

/**
 * Attestation request data.
 */
export class SpecificProofRequest {
  /**
   * Round of the attestation request submission
   */
  @IsInt()
  roundId: number;
  /**
   * Attestation request data as submitted to State Connector smart contract
   */
  @IsHexadecimal()
  callData: string;
}
