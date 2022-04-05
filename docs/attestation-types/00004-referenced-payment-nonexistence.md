
# 00004 - Referenced Payment Nonexistence

[Definition file](../../lib/verification/attestation-types/t-00004-referenced-payment-nonexistence.ts)

## Description

Payment nonexistence is confirmed if there is no payment transaction (attestation of \`Payment\` type)
with correct \`(destinationAddress, paymentReference, amount)\` combination
and with transaction status 0 (success) or 2 (failure, receiver's fault). 
Note: if there exist only payment(s) with status 1 (failure, sender's fault) 
then payment nonexistence is still confirmed.

## Request format

- `attestationType`:
  - size (bytes): 2
  - internal type: `AttestationType`  
  - description: Attestation type id for this request, see `AttestationType` enum.
- `sourceId`:
  - size (bytes): 4
  - internal type: `SourceId`
  - description: The ID of the underlying chain, see `SourceId` enum.
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
- `overflowBlock`:
  - size (bytes): 4
  - internal type: `NumberLike`
  - description: Number of the overflow block - the block which has `block.timestamp > endTimestamp` and `block.blockNumber > endBlock`. Does not need to be the first such block. It has to be confirmed.
- `dataAvailabilityProof`:
  - size (bytes): 32
  - internal type: `ByteSequenceLike`
  - description: Block hash of the confirmation block for any confirmed block with block number equal or above `overflowBlock`
## Verification rules

- For a proof to be valid, there should exist a confirmed block with a strictly bigger timestamp and block number then the ones in instructions.
- Beginning of search is based on endTimestamp - CHECK_WINDOW(to be defined)
- We impose limits to endTimestamp (based on the size of the agreed chain history of the attestation providers in the following way:endTimestamp >=flare_timestamp_of_request - MAX_TIME_SKEW (a per-chain constant, large enough to accommodate time skew between flare/other chain and possible flare downtime/congestion). 
- The size of the chain history indexed by providers must be at least CHECK_WINDOW + MAX_TIME_SKEW.
- Suggested CHECK_WINDOW and MAX_TIME_SKEW are both 1 day, which requires a total 2 days of indexed history.
- Payment nonexistence is confirmed if there is no legal payment transaction (attestation type 1) with correct <reference, destination address, amount> combination and with status 0 (success) or 2 (failure, receiver's fault). Note: if there exist only payment(s) with status 1 (failure, sender's fault) then payment nonexistence is still confirmed.

## Response format

- `endTimestamp`:
  - type: `uint64`
  - description: End timestamp specified in attestation request.
- `endBlock`:
  - type: `uint64`
  - description: End block specified in attestation request.
- `destinationAddress`:
  - type: `bytes32`
  - description: Hash of the destination address.
- `paymentReference`:
  - type: `bytes32`
  - description: The payment reference searched for.
- `amount`:
  - type: `uint128`
  - description: The amount searched for.
- `firstCheckedBlock`:
  - type: `uint64`
  - description: The first confirmed block that gets checked. It is the block that has timestamp (median time) greater or equal to `endTimestamp - CHECK_WINDOW`.  
- `firstCheckedBlockTimestamp`:
  - type: `uint64`
  - description: Timestamp of the firstCheckedBlock.
- `firstOverflowBlock`:
  - type: `uint64`
  - description: The first confirmed block with `timestamp > endTimestamp` and `blockNumber  > endBlock`. 
- `firstOverflowBlockTimestamp`:
  - type: `uint64`
  - description: Timestamp of the firstOverflowBlock.


## Comments


Payment nonexistence is confirmed if there is no payment transaction (attestation of \`Payment\` type)
with correct \`(destinationAddress, paymentReference, amount)\` combination
and with transaction status 0 (success) or 2 (failure, receiver's fault). 
Note: if there exist only payment(s) with status 1 (failure, sender's fault) 
then payment nonexistence is still confirmed.

f-asset: check that \`firstCheckBlock <= currentUnderlyingBlock\` at the time of redemption request.

f-asset: check that \`firstOverflowBlock > last payment block\` (\`= currentUnderlyingBlock + blocksToPay\`).

f-asset: check that \`firstOverflowBlockTimestamp > last payment timestamp\` 
     (\`= currentUnderlyingBlockTimestamp + time to pay\`). 
