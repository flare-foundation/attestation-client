# REST APIs Provided by Attestation Providers

There are two groups of REST APIs that are relevant for use by end users.

- Attestation request REST APIs from verifier servers.
- Proof REST APIs from the attestation provider server.

## API response

The response includes the following items:

| Field        | Type   | Description                                                                                                  |
| ------------ | ------ | ------------------------------------------------------------------------------------------------------------ |
| status       | string | "OK", "PENDING", "ERROR"                                                                                     |
| data         |        | Contains the requested data (according to the request). If status is "PENDING" or "ERROR, data is undefined. |
| errorMessage | string | Contains description of the error. Undefined if status is "OK".                                              |
| errorDetails | string | Currently undefined or equal to errorMessage.                                                                |

## Attestation request API on verifier servers

Attestation request API routes on verifier servers are used to get well formatted attestation requests. Based on the [format definition for an attestation request](https://github.com/flare-foundation/state-connector-attestation-types), a user can prepare the attestation request. To fully prepare it, the user needs to know what the attestation response will be. Namely, a part of the request is also the field `messageIntegrityCode`, which is obtained by properly hashing the expected attestation response with the string `"Flare"` appended before hashing (see [Message Integrity Checks](../attestation-protocol/message-integrity.md)). The verifier web service routes are documented using the Swagger interface at `/api-doc/` route. They include:

- `/verifier/<chain>/prepare` - POST, returns attestation response for an attestation request, without checking message integrity code. Primarily used by attestation providers. (see POST object [format](../../src/servers/verifier-server/src/dtos/v-request-types.dto.ts)).
  Response data contains:

  | Field    | type   | Description                                                   |
  | -------- | ------ | ------------------------------------------------------------- |
  | hash     | string | Hash of the attestation to be included in a Merkle tree.      |
  | request  | object | Request as specify by the attestation type.                   |
  | response | object | Response to the request as specified by the attestation type. |
  | status   | string | Verification status.                                          |

- `/verifier/<chain>/integrity` - POST, tries to verify attestation request without checking message integrity code, and if it is successful, it returns the correct message integrity code (see POST object [format](../../src/servers/verifier-server/src/dtos/v-request-types.dto.ts)). Returns MIC as data.
- `/verifier/<chain>/prepareAttestation` - POST, tries to verify attestation request without checking message integrity code, and if it is successful, it returns the byte encoded attestation request with the correct message integrity code, that can be directly submitted to the State Connector contract (see POST object [format](../../src/servers/verifier-server/src/dtos/v-request-types.dto.ts)).

Note that the routes depend on a `chain`, which is one of: `btc`, `doge`, or `xrp`.

## Attestation Proof APIs

The attestation client comes with a web server (the provider server) that provides the data about the submitted attestation requests processing and voting results.
The web service routes are documented using the Swagger interface at `/api-doc/` route. They include:

- `/api/proof/get-specific-proof` - POST, given `{roundId: number, requestBytes: string}`, a submission of a specific attestation request and the actual byte array of the submitted attestation request (`callData`, a `0x`-prefixed hex string representing the byte array) to the State Connector in the round `roundId`, it returns the JSON response data, that includes the attestation proof, but only if the attestation request was successfully verified in the given round `roundId`. The response data contains

  | Field        | type   | Description                                                                 |
  | ------------ | ------ | --------------------------------------------------------------------------- |
  | roundId      | number | Id of the attestation round in which request was considered.                |
  | hash         | string | Hash of the attestation as in the Merkle tree.                              |
  | requestBytes | string | Encoded attestation request.                                                |
  | request      | object | Request as specify by the attestation type.                                 |
  | response     | object | Response to the request as specified by the attestation type.               |
  | merkleProof  | array  | Array of hashes that prove that request has is included in the Merkle tree. |

- `/api/proof/votes-for-round/{roundId}` - GET, given a `roundId` it returns a JSON response containing the list of all attestation objects that were confirmed in the round. The data contains the array of objects containing:

  | Field              | type   | Description                                                 |
  | ------------------ | ------ | ----------------------------------------------------------- |
  | requestBytes       | string | Encoded attestation request.                                |
  | verificationStatus | string | Verification status.                                        |
  | attestationStatus  | string | Attestation status.                                         |
  | roundId            | number | Id of the attestation round in which request was considered |

  The data can be used for creating the attestation proofs.

- `/api/proof/requests-for-round/{roundId}` - GET, given a `roundId` it returns a JSON response containing the list of objects describing all attestation requests that were considered in the round. The response data contains array of objects containing:

  | Field        | type   | Description                                                                 |
  | ------------ | ------ | --------------------------------------------------------------------------- |
  | roundId      | number | Id of the attestation round in which request was considered                 |
  | hash         | string | Hash of the attestation as in the Merkle tree.                              |
  | requestBytes | string | Encoded attestation request.                                                |
  | request      | object | Request as specify by the attestation type.                                 |
  | response     | object | Response to the request as specified by the attestation type.               |
  | merkleProof  | array  | Array of hashes that prove that request has is included in the Merkle tree. |

  The data can be used for investigating the status of all attestation requests in the round.

- `/api/proof/status` - GET, returns an object that includes current buffer number (voting window id) and the latest available round id, for which the attestation responses are available. The response data contains:

  | Field                  | type   | Description                                             |
  | ---------------------- | ------ | ------------------------------------------------------- |
  | currentBufferNumber    | number | Id of the round that is currently in the request phase. |
  | latestAvailableRoundId | number | Id of the latest finished round.                        |

Next: [Verification workflow](./verification-workflow.md)

[Back to home](../README.md)
