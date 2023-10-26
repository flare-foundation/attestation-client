/**
 * Attestation status
 */
export enum AttestationResponseStatus {
    /**
     * Attestation request is valid.
     */
    VALID = "VALID",
    /**
     * Attestation request is invalid.
     */
    INVALID = "INVALID",
    /**
     * Attestation request cannot be confirmed neither rejected by the verifier at the moment.
     */
    INDETERMINATE = "INDETERMINATE",
}
/**
 * Object returned as a result of attestation.
 * If status is 'VALID' then parameters @param response contains attestation response.
 * Otherwise, @param response is undefined.
 */

export class AttestationResponse<RES> {
    /**
     * Verification status.
     */
    status!: AttestationResponseStatus;
    /**
     * Attestation response.
     */
    response?: RES;
}
