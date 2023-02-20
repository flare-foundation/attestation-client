# How to use the State Connector system?

The State Connector system supports certain attestation types which are defined in the [State Connector attestation type repo](https://github.com/flare-foundation/state-connector-attestation-types). The first step for adding the new attestation types includes providing the consistent definition on that repository and obtaining the acceptance by community. The next step is actual implementation of the support for the type. This usually includes implementation of the supporting
code for attestation client and relevant verifier services and indexers.

The following questions are relevant when using the State Connector system:

- Which attestations can the system perform?
- How can an attestation request be submitted?
- How to assemble a proof once the attestation request is verified?
- How can one use a proof in a smart contract?

## Supported attestation request

The State Connector system is request-response based system that supports proving certain data from other blockchains and data sources. Attestation requests are 
requests for proof of a specific type of data on external data source. An example of an attestion request type is "prove that certain payement is confirmed on the Bitcoin chain". The list of the supported types of attestation requests is available [here](https://github.com/flare-foundation/state-connector-attestation-types). It includes the formats of attestation requests for specific types, attestation responses and the rules for verification.

## Submission of the attestation request

Attestation requests should be submitted to the [State Connector smart contract](../attestation-protocol/state-connector-contract.md) on a relevant Flare Networks chain using the function:

```
function requestAttestations(bytes calldata _data) external;
```

An attestation request should be encoded into a bytes array. For encoding/decoding/hashing use the Typescript library from this project, together with dependencies. It includes the files from the following folders:

- `src/verification/attestation-types`
- `src/verification/generated`
- `src/verification/generated/sources`

The external dependencies include `web3.js` library. 

### Round id of the attestation request

Based on a block timestamp of the attestation request transaction, the attestation request gets assigned to the voting round (`roundId`).
By reading the variables `BUFFER_TIMESTAMP_OFFSET` and `BUFFER_WINDOW` from the [State Connector smar contract](../attestation-protocol/state-connector-contract.md) we can calculate `roundId` from the transaction's `block.timestamp` as follows

```
roundId = (block.timestamp - BUFFER_TIMESTAMP_OFFSET) / BUFFER_WINDOW
```

Note that `block.timestamp` is in seconds on Flare networks, thus integer. The division in the formula above is the integer division (floor).

## Assembling the proofs

After the attestation request is submitted to the State Connector smart contract, it gets processed by the attestation protocol and it is confirmed or rejected in about 3-5 mins (the time for the calculation of the consensus Merkle root). The attestation proof consists of the following data:

- `roundId` of the attestation request.
- attestation response
- Merkle proof

The data for a proof should be obtained from the [Proof API](./apis.md) provided by one of the attestation providers, that has voted correctly.

## Using a proof with a smart contract

Once the proof data is obtained, it can be used in a smart contract that supports the verification of the proof. The specific contract code for proof verification is available in [AttestationClientBase.sol](../../contracts/generated/contracts/AttestationClientBase.sol). One can also inherit from
[AttestationClientSC.sol](../../contracts/generated/contracts/AttestationClientSC.sol) and implement relevant methods that use the verification methods from the inherited `AttestationClientBase.sol`.

For easier understanding, see an [example attestation verification workflow](./verification-workflow.md).

Next: [Code generation](./apis.md)

[Back to home](../README.md)
