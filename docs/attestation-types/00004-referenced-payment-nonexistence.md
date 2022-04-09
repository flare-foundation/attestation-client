[TOC](../README.md)

# 00004 - Referenced Payment Nonexistence

[Definition file](../../lib/verification/attestation-types/t-00004-referenced-payment-nonexistence.ts)

## Description

[Standardized payment references](../definitions/payment-reference.md) are used to indicate special transactions that a DeFi system using the attestation protocol can require to be made by its users to be able to match them to users and purpose. Such transactions must be executed until certain deadline. The purpose of this attestation type is to provide a proof that a transaction (payment) with a specific payment reference and sending a specific amount of native currency to a specific address was not carried out up to certain deadline. Such an attestation can be used as a breach or payment obligations a user may have in relation to a DeFi system.

In some cases it could happen that a user tried to fullfil the obligation, but the obligation could not be fulfilled since which was not due to his fault, but rather the fault of the receiver (e.g. input transactions are blocked). On some blockchains such transactions are recorded as failed transaction with special failure statuses, which indicate that the fault is on the receiving side and that the sender did all in its power to fullfil the obligation. See [here](../definitions/transaction-status.md for discussion on transaction status).

The attestations of this type are confirmed only if the required transaction was not made in due time or it was made in due time, but it failed due to the receiver's fault. 

Deadline for a transaction to be made is usually provided by two limitations:
- `deadlineBlockNumber` - the last block number to be counted in as valid
- `deadlineTimestamp` - the last block timestamp in seconds to be counted in as valid

Given a transaction in block `blockNumber` with `blockTimestamp` a transaction for which one of the following is true meets the criteria of being executed in time:
- `blockNumber <= deadlineBlockNumber`, or
- `blockTimestamp <= deadlineTimestamp`.

An **overflow block** block is the first block for which block number and timestamp are both strictly greater than `deadlineBlockNumber` and `deadlineTimestamp`. 

A query window synchronization mechanism uses the hash `upperBoundProof` of a confirmation block for a synchronized confirmed upper boundary block between attestation providers. For this attestation to be valid, the `upperBoundProof` must be provided in the request for such a confirmed block that is overflow block. Otherwise the attestation is rejected.


Upon not being able to find the required transaction, a successful attestation is provided by extracting certain data from the indexer and request
- required deadline timestamp
- required deadline block number
- required destination address
- required amount
- required payment reference
- lower query boundary block number
- lower query boundary block timestamp
- first overflow block number
- first overflow block timestamp

In such a way the attestation confirms the required transaction did not appear in the interval between lower query boundary block (included) and the first overflow block (excluded). 
## Request format

- `attestationType`:
  - size (bytes): 2
  - internal type: `AttestationType`  
  - description: Attestation type id for this request, see `AttestationType` enum.
- `sourceId`:
  - size (bytes): 4
  - internal type: `SourceId`
  - description: The ID of the underlying chain, see `SourceId` enum.
- `upperBoundProof`:
  - size (bytes): 32
  - internal type: `ByteSequenceLike`
  - description: The hash of the confirmation block for an upper query window boundary block.
- `endTimestamp`:
  - size (bytes): 4
  - internal type: `NumberLike`
  - description: Maximum median timestamp of the block where the transaction is searched for.
- `endBlock`:
  - size (bytes): 4
  - internal type: `NumberLike`
  - description: Maximum number of the block where the transaction is searched for.
- `destinationAddress`:
  - size (bytes): 32
  - internal type: `NumberLike`
  - description: Hash of exact address to which the payment was done to.
- `amount`:
  - size (bytes): 16
  - internal type: `NumberLike`
  - description: The exact amount to search for.
- `paymentReference`:
  - size (bytes): 32
  - internal type: `ByteSequenceLike`
  - description: The payment reference to search for.


## Verification rules

- The confirmed block that is confirmed by the confirmation block with the hash `upperBoundProof` must be an overflow block.
- Payment nonexistence is confirmed if there is no [native payment](../definitions/native-payment.md) transactions with [standardized payment reference](../definitions/payment-reference.md) that meets all criteria for Payment attestation type (00001 - Payment) and its transaction status is 0 - Success or 2 - Failure due to receiver. 
- If there exist only payment(s) with status 1 (failure, sender's fault) then payment nonexistence is still confirmed.

## Response format

- `deadlineTimestamp`:
  - type: `uint64`
  - description: Deadline timestamp specified in the attestation request.
- `deadlineBlockNumber`:
  - type: `uint64`
  - description: Deadline block specified in the attestation request.
- `destinationAddress`:
  - type: `bytes32`
  - description: Hash of the destination address.
- `paymentReference`:
  - type: `bytes32`
  - description: The payment reference searched for.
- `amount`:
  - type: `uint128`
  - description: The amount searched for.
- `lowerBoundaryBlockNumber`:
  - type: `uint64`
  - description: The first confirmed block that gets checked. It is the lowest block in the synchronized query window.  
- `lowerBoundaryBlockTimestamp`:
  - type: `uint64`
  - description: Timestamp of the firstCheckedBlock.
- `firstOverflowBlockNumber`:
  - type: `uint64`
  - description: The first confirmed block with `timestamp > deadlineTimestamp` and `blockNumber  > deadlineBlockNumber`. 
- `firstOverflowBlockTimestamp`:
  - type: `uint64`
  - description: Timestamp of the firstOverflowBlock.


## Comments

A DeFi system should use the data of from the attestation (proof) according to its needs. Note that due to limited history and time dependant lower query bound (depends on state connector `roundId`) it may happen that `lowerBoundaryBlockNumber` is too high (attestation may be requested too late). Determination of the `lowerBoundaryBlockNumber` depends on Flare network timestamp which may differ from real time and as the block timestamps on other chains could vary even more. The time skew that between the other chain times must also be accounted for.

Next: [Attestation client](../attestation-client/attestation-client.md)
