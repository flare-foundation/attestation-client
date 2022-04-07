
# 00003 - Confirmed Block Height Exists

[Definition file](../../lib/verification/attestation-types/t-00003-confirmed-block-height-exists.ts)

## Description

The purpose of this attestation type is to prove that a block on a certain height exists and it is confirmed. 
The attestation uses `upperBoundProof` as a hash of the confirmation block for the highest confirmed block in the query.
-  
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

## Verification rules

Given the upper boundary for the query range (`upperBoundProof`) the confirmed block on the upper query window boundary is determined and provided in response, together with the block timestamp. In addition, the number of confirmations that was used to determine the confirmation block is provided. Also average block production time in the query window is calculated and returned.
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
- `averageBlockProductionTimeMilisec`:
  - type: `uint64`
  - description: Average number of seconds passed between last X blocks

## Comments