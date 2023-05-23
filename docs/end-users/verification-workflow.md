# Verification Smart Contract and User Workflow

Consider the case of a smart contract that allows the user to use some service if it provides a payment proof for a specified payment on the Ripple blockchain.

## Smart Contract Requirements

Consider one of the [supported attestation types](https://github.com/flare-foundation/state-connector-attestation-types): the `Payment` type.
The contract implements at least two functionalities:

- Generation of payment requests on the Ripple chain for the required service (e.g., by calling the function `requestServiceUsage(...)`)
- Verification of the payment proofs and unlocking of the service when payment is carried out and proved (e.g., the function `provePayment(...)`)

## Usage Workflow

### Initiating Request for Service Usage

The user wanting to use the service, first calls the `requestServiceUsage(...)` function.
The contract records the data that `msg.sender` has requested the service usage. Then it issues a 32-byte payment reference, specified for the user and the service usage request. It returns a request for payment containing:

- The payment reference.
- An address on Ripple network for the payment of the service.
- Amount in XRP to be paid for the service.

### Paying on the Ripple Network

After receiving the request for a payment, the user can execute a payment in the Ripple network. The payment reference must be included in the memo field. Once the transaction is confirmed, the user records the transaction ID (e.g., `XYZ`).

### Preparing an Attestation Request to Prove the Payment

Next the user needs to assemble the attestation request for payment.

The Typescript formats for attestation requests are available in [src/verification/generated/attestation-request-types.ts](src/verification/generated/attestation-request-types.ts).

Based on the XRP payment transaction, the `ARPayment` request object is assembled. For the [`messageIntegrityCode`](../attestation-protocol/message-integrity.md) field, the attestation response needs to be determined. To obtain it, the user can either construct the expected response by using the XRP blockchain transaction data or hash it using the `function hashPayment(request: ARPayment, response: DHPayment, salt?: string)`, where the salt is set as `Flare`. The function is available in [src/verification/generated/attestation-hash-utils.ts](src/verification/generated/attestation-hash-utils.ts).

Then the attestation request can be encoded using `function encodePayment(request: ARPayment)` in [src/verification/generated/attestation-request-encode.ts], making it ready to send to the State Connector contract. Alternatively, one can use any verifier server for the Ripple blockchain and a POST API route [`/verifier/xrp/prepareAttestation`](./apis.md#attestation-request-api), and post the attestation request JSON object with an empty `messageIntegrityCode`.

If the request can be verified, the route calculates the attestation response and returns the byte encoded attestation request with the correct `messageIntegrityCode`, which can be submitted directly to the [State Connector](../attestation-protocol/state-connector-contract.md) smart contract.

### Sending the Attestation Request

The user then [submits](./state-connector-usage.md#how-to-submit-an-attestation-request) the byte encoded attestation request to the [State Connector](../attestation-protocol/state-connector-contract.md) smart contract and waits for the attestation protocol to confirm it.

Depending on the timestamp of the attestation request submission, the voting round ID (`roundId`) is [calculated](./state-connector-usage.md#how-do-i-know-in-which-voting-round-id-my-attestation-request-was-submitted) .

The user waits for about 2 to 3 voting windows (3 to 5 minutes) or monitors the [State Connector](../attestation-protocol/state-connector-contract.md) smart contract to ensure that the confirmed Merkle root for the voting round `roundId` is obtained.

### Obtaining the Attestation Proof

Then the user can query the [Proof REST APIs](./apis.md) of selected attestation providers.

One can use either the GET route [`api/proof/votes-for-round/{roundId}`](./apis.md#proof-api) and extract the data for the relevant attestation request, or use the more direct POST route [`api/proof/get-specific-proof`](./apis.md#proof-api), to which the `roundId` and the attestation request (byte string) are posted and the proof data in JSON form are obtained.

The proof data includes fields `roundId`, `response` and `merkleProof` that together constitute a [proof](./state-connector-usage.md#assembling-the-proofs) that can be submitted to a verifying contract.

## Implementing the Smart Contract

The smart contract that is able to verify the proof can be implemented by inheriting the [contracts/generated/contracts/SCProofVerifier.sol](../../contracts/generated/contracts/SCProofVerifier.sol) contract and implementing the custom method:

```solidity
provePayment(uint32 _chainId, Payment calldata _data)
```

The struct `Payment` contains the whole proof, which is defined in [contracts/generated/interface/ISCProofVerifier.sol](contracts/generated/interface/ISCProofVerifier.sol). At the beginning of the implemented function `provePayment`, one uses the inherited function `verifyPayment(...)` to verify the proof data. If the `verifyPayment` function returns `true`, then the data in the `Payment` struct can be trusted. The rest of the function should check whether the provided attestation response, the struct `Payment`, matches the requirements (required payment amount, the correct destination address, etc.). Upon successful verification of requirements, the contract allows the user to use the service, as it has fulfilled its payment obligations.
The user deploys the contract with the relevant `StateConnector` contract address provided in the constructor.

For test purposes and as a simple example, the [SCProofVerifier.sol](../../contracts/generated/contracts/SCProofVerifier.sol) contract can be deployed directly and can be used as a test example as well, where the function `verifyPayment(...)` gets the result of verification.

An example code with calls to the [SCProofVerifier.sol](../../contracts/generated/contracts/SCProofVerifier.sol) contract is available in the [test/generated/SCProofVerifierMock](../../test/generated/SCProofVerifierMock.test-contract.ts) test contract. A specific smart contract using only certain attestation proofs can be implemented by extracting relevant code from the generated contracts and interfaces in the folder [contracts/generated](../../contracts/generated/).

[Back to home](../README.md)
