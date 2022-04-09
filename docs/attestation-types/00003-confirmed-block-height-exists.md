[TOC](../README.md)

# 00003 - Confirmed Block Height Exists

[Definition file](../../lib/verification/attestation-types/t-00003-confirmed-block-height-exists.ts)

## Description

The purpose of this attestation type is to prove that a block on a certain height exists and it is confirmed. 
The attestation uses `upperBoundProof` as a hash of the confirmation block for the highest confirmed block in the query.

A successful attestation is provided by providing the following data:
- block number
- block timestamp
- number of confirmations used
- average block production time
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

Given the upper boundary for the query range (`upperBoundProof`) the confirmed block on the upper query window boundary is determined and provided in response, together with the block timestamp. In addition, the number of confirmations that was used to determine the confirmation block is provided. Also average block production time in the query window is calculated and returned. Here we take the lowest and the highest (confirmed) block number in the query window and their respective timestamps. The timestamps are given in seconds, but the average block production rate is calculated in milliseconds.
```
                                        (highestBlock.timestamp - lowestBlock.timestamp) * 1000
averageBlockProductionTimeMs = floor(  ---------------------------------------------------------- )
                                            highestBlock.number - lowestBlock.number
```

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
- `averageBlockProductionTimeMs`:
  - type: `uint64`
  - description: Average block production time based on the data in the query window.

Next: [00004 - Referenced Payment Nonexistence](./00004-referenced-payment-nonexistence.md)
