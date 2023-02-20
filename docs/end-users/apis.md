# APIs

There are two groups of APIs that are relevant for use by end users.
- attestation request APIs from verifier servers
- proof APIs from attestation client servers

## Attestation request APIs routes

Attestation request API routes are used to get well formatted attestation requests. Based on the goal of attestation and the the [format](https://github.com/flare-foundation/state-connector-attestation-types) of the attestation request a user can prepare most of the attestation request. In order to fully prepare it, 
the user needs to know what will be the attestation response. Namely a part of the request is also message integrity code, which is obtained by properly hashing the expected attestation response with string `"Flare"` appended before hashing.
The verifier web service routes are documented using the Swagger interface at `/api-doc/` route. They include:

`verifier/<chain>/prepare` - POST, returns attestation response for an attestation request, without checking message integrity code.
`verifier/<chain>/integrity` - POST, tries to verify attestation request without checking message integrity code, and if it is successful, it returns the correct message integrity code.
`verifier/<chain>/prepareAttestation` - POST, tries to verify attestation request without checking message integrity code, and if it is successful, it returns the byte encoded attestation request with the correct message integrity code, that can be directly submitted to the State Connector contract.

Note that the routes depend on a `chain`, which is one of: `btc`, `doge` or `xrp`.

## Proof API routes

Attestation client comes with a web server that provides the data about the routes the attestation client attestation request processing and voting results.
The web service routes are documented using the Swagger interface at `/api-doc/` route. They include:

- `api/proof/get-specific-proof` - POST, given `{roundId, byteCallData}` for a specific attestation request submitted to the State Connector in the round `roundId` it returns the response data, that includes the proof, but only if the attestation was successful.
- `api/proof/votes-for-round/{roundId}` - GET, given a `roundId` it returns a JSON response containing the list of attestation objects. Each attestation object contains attestation round, attestation hash, attestation request and attestation response. The data can be used for creating the attestation proofs .
- `api/proof/requests-for-round/{roundId}` - GET, given a `roundId` it returns a JSON response containing the list of objects describing attestation requests. Each such object contains attestation round, request bytes, verification status, attestation status and exception error (if relevant). The data can be used for investigating the status of all attestation requests in the round.
- `api/proof/status` - GET, returns an object that includes current buffer number and the latest available round id, for which the attestation responses are available. 
client).

Next: [Verification workflow](./verification-workflow.md)

[Back to home](../README.md)

