///////////////////////////////////////////////////////////////
// THIS IS GENERATED CODE. DO NOT CHANGE THIS FILE MANUALLY .//
///////////////////////////////////////////////////////////////

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
 * This is a general object definition independent of the attestation type this verifier is implementing
 */
export class EncodedRequestResponse {
    constructor(params: { status: AttestationResponseStatus; abiEncodedRequest?: string }) {
        Object.assign(this, params);
    }

    /**
     * Verification status.
     */
    status: AttestationResponseStatus;

    /**
     * Abi encoded request object see this for more info: https://gitlab.com/flarenetwork/state-connector-protocol/-/blob/main/attestation-objects/request-encoding-decoding.md
     */
    abiEncodedRequest?: string;
}

export class EncodedRequest {
    /**
     * Abi encoded request object see this for more info: https://gitlab.com/flarenetwork/state-connector-protocol/-/blob/main/attestation-objects/request-encoding-decoding.md
     */
    abiEncodedRequest: string;
}

export class MicResponse {
    constructor(params: { status: AttestationResponseStatus; messageIntegrityCode?: string }) {
        Object.assign(this, params);
    }

    /**
     * Verification status.
     */
    status: AttestationResponseStatus;

    /**
     * Message integrity code
     */
    messageIntegrityCode?: string;
}
