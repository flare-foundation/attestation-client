
# 00002 - Balance Decreasing Transaction

[Definition file](../../lib/verification/attestation-types/t-00002-balance-decreasing-transaction.ts)

## Description

Any transaction can be seen as balance decreasing if funds could have left the source address (e.g. due to fees). So even if no funds are sent out, or even the balance is increased, but the address was used as an input, this is considered as a source address using transaction. 

In the context of the fAsset system, this type of transaction is illegal for an Agent’s address unless it is part of some legal flow.

## Request format

- `attestationType`:
  - size (bytes): 2
  - internal type: `AttestationType`  
  - description: Attestation type id for this request, see `AttestationType` enum.
- `sourceId`:
  - size (bytes): 4
  - internal type: `SourceId`
  - description: The ID of the underlying chain, see `SourceId` enum.
- `inUtxo`:
  - size (bytes): 1
  - internal type: `NumberLike`
  - description: Index of the sourceAddress on utxo chains.
- `id`:
  - size (bytes): 32
  - internal type: `ByteSequenceLike`
  - description: Transaction hash to search for.
- `dataAvailabilityProof`:
  - size (bytes): 32
  - internal type: `ByteSequenceLike`
  - description: Block hash of the confirmation block for the searched transaction (e.g. at least 6 blocks after the block with transaction). Determines the upper bound in terms of blocks for the search.

## Verification rules

### General
- Only transactions that are signed by the source address' account are considered - so called Externally Owned Accounts (EOA). 

### UTXO (BTC, LTC, DOGE) specific
- A valid (single address) must appear on `inUtxo`.

### XRP specific
- transaction must exist.

## Response format
- `blockNumber`:
  - type: `uint64`
  - description: Number of the transaction block on the underlying chain.
- `blockTimestamp`:,
  - type: `uint64`
  - description: Timestamp of the transaction block on the underlying chain.
- `transactionHash`:,
  - type: `bytes32`
  - description: Hash of the transaction on the underlying chain.
- `utxo`:
  - type: `uint8`
  - description: Output index for transactions with multiple outputs.
- `sourceAddress`:
  - type: `bytes32`,
  - description: Hash of the source address as a string. For utxo transactions with multiple addresses, it is the one for which `spent` is calculated and was indicated in the state connector instructions by the `inUtxo` parameter.
- `spentAmount`:
  - type: `int256`
  - description: The amount that went out of the `sourceAddress`, in smallest underlying units. It includes both payment value and fee (gas). For utxo chains it is calculcated as `outgoing_amount - returned_amount` and can be negative, that's why signed `int256` is used.
- `paymentReference`: 
  - type: `bytes32`
  - description: If the attestation provider detects that the transaction is actually a valid payment (same conditions as for Payment), it should set this field to its the paymentReference. Otherwise, paymentReference must be 0.


## Comments

For EVM: attesting on a proof is very hard if this is not an EOA account. So we must block Agents from using a non EOA address. This will be forced by having them do one payment for the underlying address before it is approved to be used. Might also be relevant for other non EVM chains. We should research how to force it for other chain types.