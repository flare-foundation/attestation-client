
# 00002 - Balance Decreasing Transaction

[Definition file](../../lib/verification/attestation-types/t-00002-balance-decreasing-transaction.ts)

## Description

The purpose of this attestation type is to prove that a transaction was issued from a given account (address) that could possibly facilitate decreasing a decrease of funds on the account (source address). In some DeFi protocols or applications monitoring the balance of specific accounts is of utmost importance. This includes detecting transactions that are outside of prescribed protocol workflows. Using balance decreasing proof one (e.g. challenger) can signal to a DeFi protocol that some transaction has happened and the protocol can verify, whether the transaction is legit or it is a part of illegal action. Based on that the smart contracts running the protocol can sanction the offender and possibly reward the provider of the proof.

Any transaction can be seen as balance decreasing if funds could have left the source address (e.g. due to fees). So even if no funds are sent out, or even the balance is increased, but the address was used as an input, this is considered as a balance decreasing transaction for a source address.

For this attestation type we assume that the source address being tested is not a contract account, but something called Externally Owned Account (EOA, in Ethereum terminology). Basically that means that this is an address from which funds can be removed only if the owner of the private key for the address signs the payment transaction. Hence, prior to using the proof the DeFi protocol or application that uses the proof should verify, that the account being checked is EOA.

Namely, if this is a contract account, removal of funds from the contract address could be carried out in many different ways, using the contract calls, self-destruct mechanism, etc. Using the self-destruct mechanism, even an address that could be contract address but nothing is yet deployed there can be abused. 
Verification whether a certain source address is EOA depends on a chain. In non-smart contract chains (like BTC, LTC, DOGE, XRP, ...) all addresses are EOAs. 

## Request format

Beside the standard fields (`attestationType`, `sourceId` and `upperBoundProof`) the request for Payment attestation type contains in addition fields `id` and `inUtxo`.

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
  - description: Index of the sourceAddress on utxo chains.

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