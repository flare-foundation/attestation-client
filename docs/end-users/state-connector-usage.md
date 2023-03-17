# Using State Connector system

## What is State Connector system?

The State Connector system is request-response based system that supports proving certain data and facts from other blockchains and data sources. It runs on Flare Networks (Songbird, Flare, Coston, Coston2).

## Why would I need the State Connector system?

For example, I can implement a smart contract on a Flare Network, which acts upon a proof that somebody made specific payment on Bitcoin network. In such a way, somebody can buy a NFT on a Flare Network while paying on Bitcoin. The payment is made, the proof is required from State Connector system and used on the NFT smart contract to mint the NFT.

Another example would be I require a specific payment of in XRP up to certain timestamp to release a collateral on Flare. The State Connector system can be used to prove that the payment was done in due data (and the collateral can be released), or it can be used to prove that the payment was not carried out in due data and the proof can be used to liquidate the collateral.

The State Connector system allows for extensions of the types of the proofs and data sources (blockchains) in the form of new attestation types. Once those are introduced they can be used for new uses.

## How can State Connector system be used?

- To prove a given fact, say about a transaction with given `txid` on Bitcoin network, we form an attestation request (a specific JSON object).
- The request is then encoded into the byte sequence and submitted to the [StateConnector](../attestation-protocol/state-connector-contract.md) contract
- After 3-5 mins, the request is either confirmed or not. If it is confirmed, the attestation are grouped into a Merkle tree and the Merkle root is stored into the [StateConnector](../attestation-protocol/state-connector-contract.md) contract.
- Checking whether the attestation request was proven and obtaining the proof data is carried out through REST API routes served by attestation providers.
- Once the proof data is obtained, it can be submitted to a smart contract that can verify the proof and act upon it.

## What is an attestation request?

Attestation request is a type of a predefined and parametrized query submitted to the [StateConnector](../attestation-protocol/state-connector-contract.md) smart contract with the goal of proving certain data or facts from an external data source. An example of an attestation request is _"prove that a certain payment is confirmed on the Bitcoin chain"_. Such an attestation request triggers validation of the query by attestation providers in a decentralized manner. If the query gives a positive response, certain data called attestation response are produced and attested for by each attestation provider. See details for attestation protocol [here](../attestation-protocol/attestation-protocol.md).

## What is an attestation response?

Attestation response is a JSON like response obtained in the process of verification of an attestation request, in case the attestation request can be verified. The Typescript types for attestation responses matching attestation requests are available [here](../../src/verification/generated/attestation-hash-types.ts).

## Which kinds of attestation requests can the State Connector system currently perform?

The list of the supported types of attestation requests is available on the [State Connector attestation type repo](https://github.com/flare-foundation/state-connector-attestation-types). It includes the formats of attestation requests for specific types, attestation responses and the rules for verification.

## How can I form an attestation request?

Attestation request is formed in JSON format and then encoded to the relevant byte sequence. Understanding of attestation type [definitions](https://github.com/flare-foundation/state-connector-attestation-types) and the context of the data we want to prove is essential in filling in the request data. The JSON structure of the attestation requests is available [here](../../src/verification/generated/attestation-request-types.ts). The functions for encoding JSON formats to byte sequences represented with `0x`-prefixed hex strings are available [here](../../src/verification/generated/attestation-request-encode.ts). See also the question about the use of the code as a Typescript library below.
Certain [REST API routes](./apis.md) provided by attestation providers can be used when helping to forming attestation requests.

## Which are generic fields each attestation request has?

Each [attestation request](../../src/verification/generated/attestation-request-types.ts) in JSON form has three generic fields:

- `attestationType` - enum, of the type [AttestationType](../../src/verification/generated/attestation-types-enum.ts)
- `sourceId` - enum, of the type [SourceId](../../src/verification/sources/sources.ts)
- `messageIntegrityCode` - a `0x`-prefixed 32-byte string, a hash, that is used to indicate, what attestation response should be obtained.

## What is message integrity code?

Attestation requests are used to obtain proofs from the State Connector system. In the process the attestation provides process an attestation request and if they verify it they obtain attestation response. When sending the request we already know, what the correct response should be and we just want the State Connector system to provide a proof for the data, that can be used with smart contracts on a Flare Networks blockchain. To provide better security and stability of the State Connector system the protocol requires that we indicate in unambiguous way, what the response should be using the
message integrity code. This is obtained by essentially taking the expected attestation response and concatenating to it the string `"Flare"`, called _salt_. The helper functions for doing this are available [here](../../src/verification/generated/attestation-hash-utils.ts).

## How can I calculate message integrity code?

First you need to form the the attestation request with all the fields except the `messageIntegrityCode`, which can be set to an empty string. The
object should match the fields of the relevant [attestation request type](../../src/verification/generated/attestation-request-types.ts). Then there are two options:

- Form the object for the [expected attestation response](../../src/verification/generated/attestation-hash-types.ts) and use the relevant hashing function from [hashing library](../../src/verification/generated/attestation-hash-utils.ts) and salt `Flare`.
- Use one of the verifier server REST API method provided by any attestation provider (`/verifier/<chain>/integrity` or `/verifier/<chain>/prepareAttestation`). Verifier server REST APIs usually require API key.

## How to submit an attestation request?

Attestation requests should be submitted to the [StateConnector](../attestation-protocol/state-connector-contract.md) smart contract on a relevant Flare Networks blockchain (Flare, Songbird, Coston, Coston2) using the function:

```
function requestAttestations(bytes calldata _data) external;
```

The `_data` parameter is the `0x`-prefixed byte sequence encoded attestation request. To communicate with the blockchain libraries such as `web3` or `ethers` can be used.

## What happens after I submit an attestation request?

The attestation request is successfully submitted if the transaction calling the `requestAttestations(...)` function on the [StateConnector](../attestation-protocol/state-connector-contract.md) smart contract is successful. It is important to read out the transaction's timestamp from the blockchain, since the timestamp determines the voting round id to which the transaction is submitted (see the question below).
Successfully submitted transaction triggers validation of the attestation request by attestation providers. The result of validation will be available
in 3-5mins.

### How do I know in which voting round id my attestation request was submitted?

Based on the block timestamp of the attestation request transaction, the attestation request gets assigned to the voting round (`roundId`).
By reading the variables `BUFFER_TIMESTAMP_OFFSET` and `BUFFER_WINDOW` from the [State Connector](../attestation-protocol/state-connector-contract.md) smart contract, we can calculate `roundId` from the transaction's `block.timestamp` as follows

```
roundId = (block.timestamp - BUFFER_TIMESTAMP_OFFSET) / BUFFER_WINDOW
```

Note that `block.timestamp` is in seconds on Flare Networks, thus it is an integer number. The division in the formula above is the integer division (floor).

## Who are attestation providers?

They are external entities that verify attestation requests by looking into data on relevant external data sources/blockchains. Verification is done by each attestation provider independently in a decentralized manner. Each also provides certain REST API routes used that can be used to obtain the attestation proofs, monitor attestation request progress and help in forming correct attestation requests.

## Do I submit attestation request to an attestation provider?

No. Attestation request is submitted to a Flare Networks blockchain, using the `requestAttestations(...)` function on the [StateConnector](../attestation-protocol/state-connector-contract.md) smart contract.

## Which code should I use in my web UI application to handle attestation requests and attestation responses?

For encoding/decoding/hashing operations use the Typescript code that can be extracted from the following folders:

- `src/verification/attestation-types`
- `src/verification/generated`
- `src/verification/sources`

The external NPM dependencies include

- `web3`
- `glob`
- `bn.js`

## How do I get a proof for the submitted attestation request?

After an attestation request is submitted it is important to record/remember two pieces od data:

- the byte encoded attestation request,
- the round id, in which the attestation request was submitted.

These two pieces of data will help you find the proof data, if the attestation request was successfully validated.
In order to obtain the proof, certain REST API routes on attestation provider servers need to be queried. For that purpose, relevant
URL(s) of attestation providers' public servers need to be obtained and queried.
To obtain the proof for my specific request, the API route `/api/proof/get-specific-proof` on an attestation provider's server should be used.
The input parameters of this POST request include the two pieces of data stated above. See [here](./apis.md) for more details.
The response of the API route contains all the needed data to assemble the proof ready to submit to a verifying contract.

## What if I cannot obtain the proof from the REST API of an attestation provider's server?

If your attestation request was successfully submitted, one of two options can happen in case there is no proof available on `/api/proof/get-specific-proof`:

- not enough time has passed. Retry later. If the result exists, it should be available in at most 5 minutes, usually less.
- the specific attestation provider did not participate in the voting round. Try with API route on some other attestation provider's server
- attestation request was not validated. Use `/api/proof/requests-for-round/{roundId}` route to see whether the status of the processing of all
  attestation requests in the specific round.

## How do I assemble attestation proof for use with the verifying smart contract?

The attestation proof consists of the following data:

- `roundId` of the attestation request.
- attestation response, which consists of the data about the result of the attestation request, in the form as described in the definition of each attestation type.
- Merkle proof.

The data for assembling the proof should be obtained from an attestation provider's REST API as described above.

One should use the data obtained from the REST API to fill in the relevant struct object defined in [`contracts/generated/interface/ISCProofVerifier.sol`](../../contracts/generated/interface/ISCProofVerifier.sol). Some Javascript/Typescript libraries like _web3.js_ and _ethers.js_ allow sending structs as JSON objects which are almost identical to the structure of the attestation response. Hence one can use the attestation response JSON object and add the key `merkleProof`, a list of 32-byte hex hashes. Then relevant `chainId` (see [here](../../src/verification/sources/sources.ts)) and the assembled JSON object can be used in verification functions on the contract. For example, to verify the proof given a `assembled_proof_json`, for the `Payment` attestation type on Ripple blockchain (`chainId` is 3) the call `verifyPayment(3, assembled_proof_json)` will return `true`, if done on a deployed contract.

## To which smart contract I can/should submit the attestation proof?

This depends on the dApp that utilizes State Connector proofs in order to allow certain actions based on a successful proof. A generic implementation of verification functions is available here in [SCProofVerifierBase.sol](../../contracts/generated/contracts/SCProofVerifierBase.sol).

An example of such contact deployed on Coston2 network is [here](https://coston2-explorer.flare.network/address/0xA8083d78B6ABC328b4d3B714F76F384eCC7147e1/read-contract#address-tabs). The verification functions (named `verify<attestation type name>(...)`) can be used to check the proofs.

## How can I implement a dApp that uses proofs for a State Connector system?

To support all the currently available proofs and have verifier functions readily available one can develop a custom contract by inheriting [SCProofVerifier.sol](../../contracts/generated/contracts/SCProofVerifier.sol) and implement relevant methods that use the verification methods from the inherited [SCProofVerifierBase.sol](../../contracts/generated/contracts/SCProofVerifierBase.sol).

For easier understanding, see an [example attestation verification workflow](./verification-workflow.md).

## How can I add a new attestation type?

Definitions for state connector are defined in the [State Connector attestation type repo](https://github.com/flare-foundation/state-connector-attestation-types).

The first step for adding the new attestation types includes providing the consistent definition on that repository and obtaining the acceptance by the community. The next step is actual implementation of the support for the type. This usually includes implementation of the supporting
code for attestation client and relevant verifier services and indexers.

Next: [Attestation provider REST APIs](./apis.md)

[Back to home](../README.md)
