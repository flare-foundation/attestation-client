
# 00003 - Confirmed Block Height Exists

[Definition file](../../lib/verification/attestation-types/t-00003-confirmed-block-height-exists.ts)

## Description

Any transaction can be seen as balance decreasing if funds could have left the source address (e.g. due to fees). So even if no funds are sent out, or even the balance is increased, but the address was used as an input, this is considered as a source using the transaction. This type of transaction is illegal for an Agent’s address unless it is part of some legal flow.
## Request format

- `attestationType`:
  - size (bytes): 2
  - internal type: `AttestationType`  
  - description: Attestation type id for this request, see `AttestationType` enum.
- `sourceId`:
  - size (bytes): 4
  - internal type: `SourceId`
  - description: The ID of the underlying chain, see `SourceId` enum.
- `blockNumber`:
  - size (bytes): 4
  - internal type: `NumberLike`
  - description: Number of the confirmed block to prove the existence of.
- `dataAvailabilityProof`:
  - size (bytes): 32
  - internal type: `ByteSequenceLike`
  - description: Block hash of the confirmation block for the searched confirmed block number (e.g. at least 6 blocks after the block given by `blockNumber`). Determines the upper bound in terms of blocks for the search.

## Verification rules

## Response format

- `blockNumber`:
  - type: `uint64`
  - description: Number of the confirmed block that was proved to exist.
- `blockTimestamp`:,
  - type: `uint64`
  - description: Timestamp of the confirmed block that was proved to exist.
- `numberOfConfirmations`:
  - type: `uint8`
  - description: Number of confirmations for this chain
- `averageFinalizationTimeSec`:
  - type: `uint64`
  - description: Average number of seconds passed between last X blocks

## Comments