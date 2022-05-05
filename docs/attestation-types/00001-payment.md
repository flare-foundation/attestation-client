[TOC](../README.md)

# 00001 - Payment

- id: 1
- name: `Payment`  
- [Definition file](../../lib/verification/attestation-types/t-00001-payment.ts)
## Description

The purpose of this attestation type is to provide a general attestation of a _native payment_  transaction. Native payment on a blockchain is an elementary payment with the system currency, where funds are sent from one address to another. In case of chains based on the UTXO model, a specific generalization is applied (see Definitions in [flare-mcc docs](https://gitlab.com/flarenetwork/mcc/-/tree/master/docs)).

A successful attestation is provided by extracting the following data about the transaction, which includes:
- block number
- block timestamp
- transaction hash
- selected transaction input index (in UTXO chains)
- selected transaction output index (in UTXO chains)
- source address
- receiving address
- spent amount
- received amount
- [payment reference](https://github.com/flare-foundation/multi-chain-client/blob/main/docs/definitions/payment-reference.md)
- whether transaction is sending from a single address to a single other address
- [transaction status](https://github.com/flare-foundation/multi-chain-client/blob/main/docs/definitions/transaction-status.md)

Due to technical limitations on UTXO chains, the procedure for the attestation differs according to the existence of the standardized payment reference. In essence, payments with the standardized payment references undergo full indexing while other payments undergo partial indexing. In non-UTXO chains full indexing is always performed. 
## Request format

Beside the standard fields (`attestationType`, `sourceId` and `upperBoundProof`) the request for `Payment` attestation type contains in addition fields `id`, `utxo` and `inUtxo`.

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
  - description: Index of the source address on UTXO chains. Always 0 on non-UTXO chains.
- `utxo`:
  - size (bytes): 1
  - internal type: `NumberLike`
  - description: Index of the receiving address on UTXO chains. Always 0 on non-UTXO chains.

## Verification rules

- The transaction being attested must be a [native payment](https://github.com/flare-foundation/multi-chain-client/blob/main/docs/definitions/native-payment.md). 
- Payment reference is calculated only if the attested transaction conforms to [standardized payment reference](https://github.com/flare-foundation/multi-chain-client/blob/main/docs/definitions/payment-reference.md). Otherwise the payment reference is 0.
- Status of the attestation is determined as described [here](https://github.com/flare-foundation/multi-chain-client/blob/main/docs/definitions/transaction-status.md)
- If the payment status is failure (1 or 2), the received amount should be 0 and the spent amount should be only the fee spent in case of non-UTXO chains. In case of UTXO chain 0 value is provided for spent amount.
- The values of `utxo` and `inUtxo` on non-UTXO chains are always 0.
### UTXO (BTC, LTC, DOGE) chains

- Full attestation is performed only if the standardized payment reference exists (see [here](https://github.com/flare-foundation/multi-chain-client/blob/main/docs/definitions/account-based-vs-utxo-chains.md) for details). Otherwise partial attestation si performed. 
- Source address exists only if there is a unique source address on the selected input (`inUtxo`). To determine it, one needs to make additional RPC API call. If the source address does not exist, it is indicated by 0 in the response. The spent amount is 0 in this case. If the source address exists, a hash (sha3) is provided for `sourceAddressHash` in response.
- The receiving address may not exist on the selected output (`utxo`). In this case it is indicated in the response by 0. 
The received amount is 0 in this case. If the receiving address exists, the hash of it is provided for `receivingAddressHash` in response.

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
  - description: Index of the transaction input indicating source address on UTXO chains, 0 on non-UTXO chains.
- `utxo`:
  - type: `uint8`
  - description: Output index for a transaction with multiple outputs on UTXO chains, 0 on non-UTXO chains. The same as in the `utxo` parameter from the request.
- `sourceAddressHash`:
  - type: `bytes32`,
  - description: Hash of the source address viewed as a string (the one indicated by the `inUtxo` parameter for UTXO blockchains).
- `receivingAddressHash`:
  - type: `bytes32`
  - description: Hash of the receiving address as a string (the one indicated by the `utxo` parameter for UTXO blockchains).
- `spentAmount`:
  - type: `int256`
  - description: The amount that went out of the source address, in the smallest underlying units. In non-UTXO chains it includes both payment value and fee (gas). Calculation for UTXO chains depends on the existence of standardized payment reference. If it exists, it is calculated as `outgoing_amount - returned_amount` and can be negative. If the standardized payment reference does not exist, then it is just the spent amount on the input indicated by `inUtxo`.
- `receivedAmount`:
  - type: `int256`
  - description: The amount received to the receiving address, in smallest underlying units. Can be negative in UTXO chains.
- `paymentReference`: 
  - type: `bytes32`
  - description: Standardized payment reference, if it exists, 0 otherwise.
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

Next: [00002 - Balance Decreasing Transaction](./00002-balance-decreasing-transaction.md)
