/**
 * Generic interface for the request of an attestation request.
 */
export interface ARBase {
    attestationType: string;
    sourceId: string;
    messageIntegrityCode?: string;
    requestBody: any;
}

/**
 * Generic interface for the response of an attestation request.
 */
export interface ARESBase {
    attestationType: string;
    sourceId: string;
    votingRound: string;
    lowestUsedTimestamp: string;
    requestBody: any;
    responseBody: any;
}

/**
 * Generic interface for example data usually randomly generated for testing purposes and examples.
 */
export interface ExampleData<RNM, REQ, RES> {
    requestNoMic: RNM;
    request: REQ;
    response: RES;
    messageIntegrityCode: string;
    encodedRequestZeroMic: string;
    encodedRequest: string;
}
