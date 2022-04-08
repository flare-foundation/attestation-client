
# 00001 - Payment

[Definition file](../../lib/verification/attestation-types/t-00001-payment.ts)

## Description

The purpose of this attestation type is to provide a general attestation of a native payment transaction. Native payment on a blockchain is an elementary payment with the system currency, where funds are sent from one address to another. In case of chains based on the UTXO model, a specific generalization is applied.

A successful attestation is provided by extracting certain data about the transaction, which includes:
- block number
- block timestamp
- transaction hash
- selected transaction input index (in UTXO chains)
- selected transaction output index (in UTXO chains)
- source address
- receiving address
- spent amount
- received amount
- [payment reference](../payment-reference.md)
- whether transaction is sending from a single address to a single other address
- [transaction status](../transaction-status.md) (accounts for failed transactions that are recorded on blockchain).

## Request format

Beside the standard fields (`attestationType`, `sourceId` and `upperBoundProof`) the request for Payment attestation type contains in addition fields `id`, `utxo` and `inUtxo`.

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
- `id`:
  - size (bytes): 32
  - internal type: `ByteSequenceLike`
  - description: Transaction hash to search for.
- `inUtxo`:
  - size (bytes): 1
  - internal type: `NumberLike`
  - description: Index of the sourceAddress on UTXO chains.
- `utxo`:
  - size (bytes): 1
  - internal type: `NumberLike`
  - description: Index of the receivingAddress on UTXO chains.

## Verification rules

- The transaction being attested must be a [native payment](../native-payment.md). 
- Payment reference is calculated only if the attested transaction confirms to ([standardized payment reference](../payment-reference.md)). Otherwise the payment reference is 0.
- Status of the attestation is determined as described [here](../transaction-status.md)
- If the payment status is failure (1 or 2), the received amount should be 0 and the spent amount should be only the fee spent in case of non-UTXO chains. In case of UTXO chain no value is provided.
- The values of `utxo` and `inUtxo` on non-UTXO chains are always 0.
### UTXO (BTC, LTC, DOGE) chains

- Full attestation is performed only if the standardized payment reference exists (see [here](../account-based-vs-utxo-chains.md) for details). Othewise partial attestation si performed. 
- Source address exists only if there is unique source address on the selected input (`inUtxo`). To determine it, one needs to make additional RPC API call. If source address does not exist, it is indicated by 0 in response. Spent amount is 0 in this case. If source address exists, a hash (sha3) is provided for `sourceAddress` in response.
- Receiving address may not exist on the selected output (`utxo`). In this case it is indicated in response by 0. Received amount is 0 in this case. If receiving address exists, the hash of it is provided for `receivingAddress` in reponse.

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
- `inUtxo`:
  - type: `uint8`
  - description: Index of the sourceAddress on UTXO chains.
- `utxo`:
  - type: `uint8`
  - description: Output index for transactions with multiple outputs on UTXO chains.
- `sourceAddress`:
  - type: `bytes32`,
  - description: Hash of the source address as a string. For utxo transactions with multiple addresses, it is the one for which `spent` is calculated and was indicated in the state connector instructions by the `inUtxo` parameter.
- `receivingAddress`:
  - type: `bytes32`
  - description: Hash of the receiving address as a string (the one indicated by the `utxo` parameter).
- `spentAmount`:
  - type: `int256`
  - description: The amount that went out of the `sourceAddress`, in the smallest underlying units. In non-UTXO chains it includes both payment value and fee (gas). Calculation for utxo chains depends of the existence of standardized payment reference. If it exists, it is calculated as `outgoing_amount - returned_amount` and can be negative, that's why signed `int256` is used. If the standardized payment reference does not exist, then it is just the spent amount on the input indicated by `inUtxo`.
- `receivedAmount`:
  - type: `int256`
  - description: The amount the receiving address received, in smallest underlying units. Can be negative in UTXO chains.
- `paymentReference`: 
  - type: `bytes32`
  - description: Standardized payment reference, if it exists.
- `oneToOne`:
  - type: `bool`
  - description: `true` if the transaction has exactly one source address and 
exactly one receiving address (different from source).
- `status`
  - type: `uint8`
  - description: Transaction success status, can have 3 values:
    - 0 - Success
    - 1 - Failure due to sender (this is the default failure)
    - 2 - Failure due to receiver (bad destination address)
