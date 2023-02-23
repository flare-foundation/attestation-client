# APIs

There are two groups of APIs that are relevant for use by end users.
- attestation request APIs from verifier servers,
- proof APIs from attestation client servers.

## Attestation request API

Attestation request API routes are used to get well formatted attestation requests. Based on the [format](https://github.com/flare-foundation/state-connector-attestation-types) definition for a an attestation request of a specific type, a user can prepare the attestation request. In order to fully prepare it, the user needs to know what will be the attestation response. Namely a part of the request is also the field `messageIntegrityCode`, which is obtained by properly hashing the expected attestation response with the string `"Flare"` appended before hashing (see [here](../attestation-protocol/bit-voting.md#message-integrity-checks)). The verifier web service routes are documented using the Swagger interface at `/api-doc/` route. They include:

`verifier/<chain>/prepare` - POST, returns attestation response for an attestation request, without checking message integrity code.
`verifier/<chain>/integrity` - POST, tries to verify attestation request without checking message integrity code, and if it is successful, it returns the correct message integrity code.
`verifier/<chain>/prepareAttestation` - POST, tries to verify attestation request without checking message integrity code, and if it is successful, it returns the byte encoded attestation request with the correct message integrity code, that can be directly submitted to the State Connector contract.

Note that the routes depend on a `chain`, which is one of: `btc`, `doge` or `xrp`.

## Proof API

Attestation client comes with a web server that provides the data about the submitted attestation requests processing and voting results.
The web service routes are documented using the Swagger interface at `/api-doc/` route. They include:

- `api/proof/get-specific-proof` - POST, given `{roundId: number, callData: string}`, a submission of a specific attestation request and the actual byte array of the submitted attestation request (`callData`, a `0x`-prefixed hex string representing the byte array) to the State Connector in the round `roundId`, it returns the JSON response data, that includes the attestation proof, but only if the attestation request was successfully verified in the given round `roundId`.
- `api/proof/votes-for-round/{roundId}` - GET, given a `roundId` it returns a JSON response containing the list of attestation objects. Each attestation object contains attestation round, attestation hash, attestation request and attestation response. The data can be used for creating the attestation proofs .
- `api/proof/requests-for-round/{roundId}` - GET, given a `roundId` it returns a JSON response containing the list of objects describing attestation requests. Each such object contains attestation round, request bytes, verification status, attestation status and exception error (if relevant). The data can be used for investigating the status of all attestation requests in the round.
- `api/proof/status` - GET, returns an object that includes current buffer number (voting window id) and the latest available round id, for which the attestation responses are available. 

Next: [Verification workflow](./verification-workflow.md)

[Back to home](../README.md)

