# REST APIs Provided by Attestation Providers

There are two groups of REST APIs that are relevant for use by end users.

- Attestation request REST APIs from verifier servers.
- Proof REST APIs from the attestation provider server.

## Common API Fields

All responses include the following fields:

| Field          | Type   | Description                                                                                                   |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| `status`       | string | "OK", "PENDING", "ERROR"                                                                                      |
| `data`         |        | Contains the requested data (depending on the request). If status is "PENDING" or "ERROR", data is undefined. |
| `errorMessage` | string | Contains the description of the error. Undefined if status is "OK".                                           |

## Attestation Request API on Verifier Servers

Attestation request API routes on verifier servers are used to get well formatted attestation requests. Based on the [format definition for an attestation request](https://github.com/flare-foundation/songbird-state-connector-protocol/blob/main/specs/attestations/attestation-type-definition.md), a user can prepare the attestation request on their own. To fully prepare it, the user needs to know what the attestation response will be. Namely, a part of the request is also the field `messageIntegrityCode`, which is obtained by properly hashing the expected attestation response with the string `Flare` appended before hashing (see [Message Integrity Checks](../attestation-protocol/message-integrity.md)). The verifier web service routes are documented using the Swagger interface at the `/api-doc/` route. They include:

- `/verifier/<chain>/prepare` - POST: Returns the attestation response for an attestation request, without checking the message integrity code (see [POST object format](../../src/servers/verifier-server/src/dtos/v-request-types.dto.ts)).
  Response data contains:

  | Field      | Type   | Description                                                   |
  | ---------- | ------ | ------------------------------------------------------------- |
  | `hash`     | string | Hash of the attestation to be included in a Merkle tree.      |
  | `request`  | object | Request as specify by the attestation type.                   |
  | `response` | object | Response to the request as specified by the attestation type. |
  | `status`   | string | Verification status.                                          |

- `/verifier/<chain>/integrity` - POST: Tries to verify attestation request without checking message integrity code, and if it is successful, it returns the correct message integrity code (see [POST object format](../../src/servers/verifier-server/src/dtos/v-request-types.dto.ts)).

- `/verifier/<chain>/prepareAttestation` - POST: Tries to verify attestation request without checking message integrity code. If it is successful, it returns the byte encoded attestation request with the correct message integrity code, which can be directly submitted to the State Connector contract (see [POST object format](../../src/servers/verifier-server/src/dtos/v-request-types.dto.ts)).

Note that the routes depend on a `chain` parameter, which is one of: `btc`, `doge`, or `xrp`.

## Attestation Proof APIs on Attestation Providers

The attestation client includes a web server (the provider server) that provides the data about the submitted attestation requests processing and voting results.
The web service routes are documented using the Swagger interface at the `/api-doc/` route. They include:

- `/api/proof/get-specific-proof` - POST: Given `{roundId: number, requestBytes: string}`, a submission of a specific attestation request and the actual byte array of the submitted attestation request (`requestBytes`, a `0x`-prefixed hex string representing the byte array) to the State Connector in the round `roundId`, it returns the JSON response data, which includes the attestation proof, but only if the attestation request was successfully verified in the given round `roundId`. The response data contains:

  | Field          | Type   | Description                                                                                                                                                |
  | -------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `roundId`      | number | ID of the attestation round in which the request was considered.                                                                                           |
  | `hash`         | string | Hash of the attestation as in the Merkle tree.                                                                                                             |
  | `requestBytes` | string | Encoded attestation request.                                                                                                                               |
  | `request`      | object | Request as specified by the attestation type.                                                                                                              |
  | `response`     | object | Response to the request as specified by the attestation type.                                                                                              |
  | `merkleProof`  | array  | Array of hashes that prove that the request's hash is included in the Merkle tree. It can be an empty array if only one request is confirmed in the round. |

  The data can be used for creating the attestation proofs used on the Flare blockchain.

- `/api/proof/votes-for-round/{roundId}` - GET: Given a `roundId` it returns a JSON response containing the list of all attestation objects that were confirmed in the round. The data contains an array of objects containing:

  | Field          | Type   | Description                                                                        |
  | -------------- | ------ | ---------------------------------------------------------------------------------- |
  | `roundId`      | number | ID of the attestation round in which the request was considered.                   |
  | `hash`         | string | Hash of the attestation as in the Merkle tree.                                     |
  | `requestBytes` | string | Encoded attestation request.                                                       |
  | `request`      | object | Request as specified by the attestation type.                                      |
  | `response`     | object | Response to the request as specified by the attestation type.                      |
  | `merkleProof`  | array  | Array of hashes that prove that the request's hash is included in the Merkle tree. |

  It is the same as calling get-specific-proof for every confirmed request in the round.

- `/api/proof/requests-for-round/{roundId}` - GET: Given a `roundId` it returns a JSON response containing the list of objects describing all attestation requests that were considered in the round. The response data contains an array of objects containing:

  | Field                | Type   | Description                                                  |
  | -------------------- | ------ | ------------------------------------------------------------ |
  | `requestBytes`       | string | Encoded attestation request.                                 |
  | `verificationStatus` | string | Verification status.                                         |
  | `attestationStatus`  | string | Attestation status.                                          |
  | `roundId`            | number | ID of the attestation round in which request was considered. |

  The data can be used for investigating the status of all attestation requests in the round.

- `/api/proof/status` - GET: Returns an object that includes current buffer number (voting window ID) and the latest available round ID, for which the attestation responses are available. The response data contains:

  | Field                    | Type   | Description                                             |
  | ------------------------ | ------ | ------------------------------------------------------- |
  | `currentBufferNumber`    | number | ID of the round that is currently in the request phase. |
  | `latestAvailableRoundId` | number | ID of the latest finished round.                        |

Next: [Verification workflow](./verification-workflow.md)

[Back to home](../README.md)
