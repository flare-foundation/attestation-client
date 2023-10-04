///////////////////////////////////////////////////////////////
// THIS IS GENERATED CODE. DO NOT CHANGE THIS FILE MANUALLY .//
///////////////////////////////////////////////////////////////

import { AttestationResponse } from "../../../../../external-libs/AttestationResponse";
/**
 * This is a general object definition independent of the attestation type this verifier is implementing
 */
export class EncodedRequestBody {
    /**
     * Abi encoded request object see this for more info: https://gitlab.com/flarenetwork/state-connector-protocol/-/blob/main/attestation-objects/request-encoding-decoding.md
     */
    abiEncodedRequest?: string;
}

export class MicResponse {
    /**
     * Message integrity code
     */
    messageIntegrityCode?: string;
}

/**
 * DTO Object returned after attestation request verification.
 * If status is 'VALID' then parameters @param response contains attestation response.
 * Otherwise, @param response is undefined.
 */
export class AttestationResponseDTO<RES> extends AttestationResponse<RES> {}
