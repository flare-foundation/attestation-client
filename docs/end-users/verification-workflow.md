# Example verification workflow

Consider a case of a smart contract that allows the user to use some service, if it provides a payment proof for a specific payment in Ripple blockchain.

## Contract implementation 

Consider one of the [supported attestation types](https://github.com/flare-foundation/state-connector-attestation-types) - the `Payment` type.
The contract should implement at least two functionalities:

1) Generation of payment requests on Ripple chain for the required service (e.g. function `requestServiceUsage(...)`)
2) Verification of the payment proofs and unlocking of the service when payment is carried out and proved (e.g. function `provePayment(...)`)

The user wanting to use the service first calls `requestUsage(...)` function.
The contract should record data that `msg.sender` has requested the service usage. Then it should issue 32-byte payment reference, specific for the user and the service usage request. It should return a request for payment containing:

- payment reference,
- address on Ripple network for payment of the service,
- amount to be paid for the service.

Once the user receives the request for payment it can execute the payment in the Ripple network. In particular, payment reference is included in the memo field. Once the transaction is confirmed, the user records the transaction id (e.g. `XYZ`).

Then a user needs to assemble the attestation request for payment. The Typescript formats for attestation requests are available in [src/verification/generated/attestation-request-types.ts](src/verification/generated/attestation-request-types.ts). Based on the XRP payment transaction the `ARPayment` request is assembled. For the remaining field `messageIntegrityCode` the attestation response needs to be known. A user can either assemble what should response be in and hash it using the `function hashPayment(request: ARPayment, response: DHPayment, salt?: string)`, where `salt` is set as `"Flare"`. The function is available in [src/verification/generated/attestation-hash-utils.ts](src/verification/generated/attestation-hash-utils.ts). Then the attestation request can be encoded by 
`function encodePayment(request: ARPayment)` in [src/verification/generated/attestation-request-encode.ts]. Alternatively, one can use a verifier server and an API route `/verifier/xrp/prepareAttestation`, and post to it the attestation request with empty `messageIntegrityCode`. If the request can be verified, the route will calculate the attestation response and return the byte encoded attestation request that can be directly submitted to the State Connector contract.

The user then sends the byte encoded attestation request to the `StateConnector` contract and waits for the attestation protocol to confirm it. Depending on the timestamp of the attestation request submission, the voting round id (`roundId`) is calculated. See the [formula](./state-connector-usage.md#submission-of-the-attestation-request) for calculation of the `roundId`.


The user then waits for about 2-3 voting windows (3-5 mins) or monitors the `StateConnector` to ensure, that the confirmed Merkle root for the voting round `roundId` is obtained. Then it can try to query the Proof API(s) of selected attestation providers. One can use either the route `api/proof/votes-for-round/{roundId}` and extract the data for relevant attestation request, or use the more direct route `api/proof/get-specific-proof`, to which the `roundId`
 and the  attestation request (byte string) is posted and the proof data obtained.

The proof data includes fields `roundId`, `response` and `merkleProof` that together constitute a proof that can be submitted to a verifying contract.

The smart contract that is able to verify the proof can be implemented by inheriting the contract [contracts/generated/contracts/AttestationClientSC.sol](../../contracts/generated/contracts/AttestationClientSC.sol) and implementing the custom method 

```Solidity
provePayment(uint32 _chainId, Payment calldata _data)
```

Note that the struct `Payment` contains the whole proof. The structure is defined in [contracts/generated/interface/IAttestationClient.sol](contracts/generated/interface/IAttestationClient.sol). At the beginning of the implemented function one should use the inherited function `verifyPayment(...)` to verify the proof data. The rest of the function should check whether the provided attestation response data match the requirements. If this is the case, the contract should allow the user to use the service, as it has fulfilled its payment obligations. The contract should be deployed with the relevant `StateConnector` contract address provided in the constructor. The contract [AttestationClientSC.sol](../../contracts/generated/contracts/AttestationClientSC.sol) can be used as a test example as well, since the function `verifyPayment(...)` can be called directly.

An example code with calls to the contract [AttestationClientSC.sol](../../contracts/generated/contracts/AttestationClientSC.sol) is available [here](../../test/generated/AttestationClientMock.test-contract.ts). Note also that a specific smart contract using only certain attestation proofs can be implemented by extracting relevant code from the generated contracts and interfaces in the folder [contracts/generated](../../contracts/generated/).

[Back to home](../README.md)
