# REST APIs for Attestation Providers

There are two groups of REST APIs that are relevant for use by end users.

- Attestation request REST APIs from verifier servers.
- Proof REST APIs from the attestation provider server.

## Attestation Request APIs

Attestation request API routes on verifier servers are used to get well formatted attestation requests. Based on the [format definition for an attestation request](https://github.com/flare-foundation/state-connector-attestation-types), a user can prepare the attestation request. To fully prepare it, the user needs to know what the attestation response will be. Namely, a part of the request is also the field `messageIntegrityCode`, which is obtained by properly hashing the expected attestation response with the string `"Flare"` appended before hashing (see [Message Integrity Checks](../attestation-protocol/message-integrity.md)). The verifier web service routes are documented using the Swagger interface at `/api-doc/` route. They include:

- `/verifier/<chain>/prepare` - POST: Returns attestation response for an attestation request, without checking tha message integrity code (see [POST object format](../../src/servers/verifier-server/src/dtos/v-request-types.dto.ts)).
- `/verifier/<chain>/integrity` - POST: Tries to verify attestation request without checking message integrity code, and if it is successful, it returns the correct message integrity code (see [POST object format](../../src/servers/verifier-server/src/dtos/v-request-types.dto.ts)).
- `/verifier/<chain>/prepareAttestation` - POST: Tries to verify attestation request without checking message integrity code, and if it is successful, it returns the byte encoded attestation request with the correct message integrity code, that can be directly submitted to the State Connector contract(see [POST object format](../../src/servers/verifier-server/src/dtos/v-request-types.dto.ts)).

Note that the routes depend on a `chain`, which is one of: `btc`, `doge`, or `xrp`.

## Attestation Proof APIs

The attestation client comes with a web server (the provider server) that provides the data about the submitted attestation requests processing and voting results.
The web service routes are documented using the Swagger interface at `/api-doc/` route. They include:

- `/api/proof/get-specific-proof` - POST: Given `{roundId: number, callData: string}`, a submission of a specific attestation request and the actual byte array of the submitted attestation request (`callData`, a `0x`-prefixed hex string representing the byte array) to the State Connector in the round `roundId`, it returns the JSON response data, which includes the attestation proof, but only if the attestation request was successfully verified in the given round `roundId`.
- `/api/proof/votes-for-round/{roundId}` - GET: Given a `roundId`, it returns a JSON response containing the list of attestation objects. Each attestation object contains attestation round, attestation hash, attestation request and attestation response. The data can be used for creating the attestation proofs.
- `/api/proof/requests-for-round/{roundId}` - GET: Given a `roundId`, it returns a JSON response containing the list of objects describing attestation requests. Each such object contains attestation round, request bytes, verification status, attestation status and exception error (if relevant). The data can be used for investigating the status of all attestation requests in the round.
- `/api/proof/status` - GET: Returns an object that includes current buffer number (voting window id) and the latest available round id, for which the attestation responses are available.

Next: [Verification workflow](./verification-workflow.md)

[Back to home](../README.md)
