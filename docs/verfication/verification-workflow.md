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

The user then sends the attestation request to the `StateConnector` contract and waits for the attestation protocol to confirm it. Depending on the timestamp of the attestation request submission, the voting round id (`roundId`) is calculated. 

The user then waits for about 2-3 voting windows or monitors the `StateConnector` to ensure, that the confirmed Merkle root for the voting round `roundId` is obtained. Then it can try to query the Proof API(s) of selected attestation providers (the route `api/proof/votes-for-round/{roundId}`). From the API web service, the user can extract all the attestations for each attestation provider. It may happen that a specific attestation provider did not provide the correct (confirmed) Merkle root for the voting round `roundId`. Hence it is important to find and use the Proof API of the attestation provider, who submitted the Merkle root, that matches the confirmed Merkle root for the voting round `roundId`. The user should find in the Proof API response for the round the attestation data matching its attestation request. If the attestation data is not present, the request was not confirmed. Assume that the request was confirmed. Using the attestation data from the Proof API, the user can assemble the Merkle tree using the [`MerkleTree.ts`](../../src/utils/MerkleTree.ts) library. The attestation data for the user's request contains the attestation response containing the payment summary data (see the [`Payment`](https://github.com/flare-foundation/state-connector-attestation-types/blob/main/attestation-types/00001-payment.md) attestation type response).
Having the Merkle tree and the attestation response, the Merkle proof can be calculated for the attestation. An example of the Typescript code doing exactly this is available in [`test/CostonVerification.test.ts`](../../test/CostonVerification.test.ts).

Putting together the attestation response, voting round id (`roundId`) and the Merkle proof we have the full attestation proof data for submission to the smart contract. 

The smart contract can be implemented by inheriting the contract [contracts/generated/contracts/AttestationClientSC.sol](../../contracts/generated/contracts/AttestationClientSC.sol) and implementing the custom method 

```Solidity
provePayment(uint32 _chainId, Payment calldata _data)
```
At the beginning of the function one should use the inherited function `verifyPayment(...)` to verify the proof data. The rest of the function should check whether the provided attestation response data match the requirements. If this is the case, the contract should allow the user to use the service, as it has fulfilled its payment obligations. The contract should be deployed with the relevant `StateConnector` contract address provided in the constructor. The contract [AttestationClientSC.sol](../../contracts/generated/contracts/AttestationClientSC.sol) can be used as a test example as well, since the function `verifyPayment(...)` can be called directly.

An example code with calls to the contract [AttestationClientSC.sol](../../contracts/generated/contracts/AttestationClientSC.sol) is available [here](../../test/generated/AttestationClientMock.test.ts). Note also that a specific smart contract using only certain attestation proofs can be implemented by extracting relevant code from the generated contracts and interfaces in the folder [contracts/generated](../../contracts/generated/).

[Back to home](../README.md)
