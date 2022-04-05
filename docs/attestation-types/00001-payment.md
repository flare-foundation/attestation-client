
# 00001 - Payment

[Definition file](../../lib/verification/attestation-types/t-00001-payment.ts)

## Description

The purpose of this type of a proof is to show that the transaction is a native payment on a blockchain - a payment in the system currency. The payment is identified by a transaction id.


to a specific destination which is marked by payment reference. This resembles usual payments in banking systems where a receiving entity, who typically does not have knowledge of the sender's address, prescribes a payment reference (called also message, destination tag or memo). The payment reference is used by the receiver to uniquely identify the payment transaction and match to the receiver, to which the payment reference was sent prior to the payment. 

## Request format

- `attestationType`:
  - size (bytes): 2
  - internal type: `AttestationType`  
  - description: Attestation type id for this request, see `AttestationType` enum.
- `sourceId`:
  - size (bytes): 4
  - internal type: `SourceId`
  - description: The ID of the underlying chain, see `SourceId` enum.
- `utxo`:
  - size (bytes): 1
  - internal type: `NumberLike`
  - description: Index of the receivingAddress on utxo chains.
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

### UTXO (BTC, LTC, DOGE) chains

- Payment reference is calculated from `OP_RETURN` output. For a valid payment reference, there must be only one `OP_RETURN` output and the value must be long 32 bytes. In all other cases it is deemed that the payment reference does not exist.
- Source address is determined by the address on the input with the index `inUtxo`. 
- If there is no address on the indicated input, then the source address does not exists and it is indicated in the data hash as 0 hash. Spent amount is also 0. Note that if multiple addresses exist on an input this is deemed as non-existence of the source address.
- Receiving address is indicated by the output with the index `utxo`. 
- If there is no address on the indicated output, then the receiving address does not exist and it is indicated in the data hash as 0 hash. Received amount is the amount on the indicated output. Note that if multiple addresses exist on the output, this is deemed as non-existence of the receiving address.
- The rules for attestation differ depending on whether payment reference exists. 
- If payment reference does not exist:
   - if source address exists, then spent amount is equal exactly the value that is taken from the input indicated by `inUtxo`
   - if receiving address exists, then spent amount is equal exactly the value on the indicated output
   - transaction is never on-to-one
- If payment reference exists:
  - if source address exists, then spent amount is calculated as the sum of all inputs from that address subtracted by returns to that address by outputs.
  - if receiving address exists, then received amount is calculated as the sum of all outputs that go to the receiving address subtracted by the sum of all inputs that leave that address.
  - the payment is one-to-one (`oneToOne` is 1) only if one address appears on inputs and only one address appears on outputs (besides returns to the input address).
- status is always `0 - Success`, since only successful transactions can be mined into blocks.

### XRP specific

- transaction must be of type `Payment`
- only direct XRP-to-XRP payments are considered (not cross-currency payments, partial payments, or any other payment type)
- `oneToOne` is always `true` (1).
- The [following](https://xrpl.org/transaction-results.html) statuses should be considered
  - 0 - Success
    - [`tesSUCCESS`](https://xrpl.org/tes-success.html)
  - 2 - Failure due to receiver fault (bad destination address)
    - [`tecDST_TAG_NEEDED`](https://xrpl.org/tec-codes.html)
    - [`tecNO_DST`](https://xrpl.org/tec-codes.html)
    - [`tecNO_DST_INSUF_XRP`](https://xrpl.org/tec-codes.html)
    - [`tecNO_PERMISSION`](https://xrpl.org/tec-codes.html)
  - 1 - Failure due to sender fault (this is the default failure)
    - all other types of errors

### ALGO specific


## Response format

- `blockNumber`:
  - type: `uint64`
  - description: Timestamp of the transaction block on the underlying chain.
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
- `receivingAddress`:
  - type: `bytes32`
  - description: Hash of the receiving address as a string (the one indicated by the `utxo` parameter).
- `paymentReference`: 
  - type: `bytes32`
  - description: Chain dependent extra data (e.g. memo field, detination tag, tx data) For minting and redemption payment it depends on request id, for topup and self-mint it depends on the agent vault address. See PaymentReference.sol for details of payment reference calculation.
- `spentAmount`:
  - type: `int256`
  - description: The amount that went out of the `sourceAddress`, in smallest underlying units. It includes both payment value and fee (gas). For utxo chains it is calculcated as `outgoing_amount - returned_amount` and can be negative, that's why signed `int256` is used.
- `receivedAmount`:
  - type: `uint256`
  - description: The amount the receiving address received, in smallest underlying units.
- `oneToOne`:
  - type: `bool`
  - description: `true` if the transaction has exactly one source address and 
exactly one receiving address (different from source).
- `status`
  - type: `uint8`
  - description: Transaction success status, can have 3 values:
    - 0 - Success
    - 1 - Failure due to sender fault (this is the default failure)
    - 2 - Failure due to receiver fault (bad destination address)
