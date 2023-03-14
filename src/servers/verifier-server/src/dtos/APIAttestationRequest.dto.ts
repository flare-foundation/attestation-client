import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO object for posting attestation requests to verifier server
 */
export class APIAttestationRequest {
  /**
   * Attestation request in hex string representing byte sequence as submitted to State Connector smart contract.
   */
  @ApiProperty()
  request: string;
}
