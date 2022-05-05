
[TOC](../README.md)
# 00002 - Balance Decreasing Transaction

- id: 2
- name: `BalanceDecreasingTransaction`  
- [Definition file](../../lib/verification/attestation-types/t-00002-balance-decreasing-transaction.ts)

## Description

The purpose of this attestation type is to prove that a transaction was issued from a given account (address), which could possibly facilitate a decrease of funds on the account (the source address). In some DeFi protocols or applications, monitoring the balance of specific accounts is of utmost importance (e.g. accounts that hold collateral). This includes detecting transactions that are outside of the application specific protocol workflows. Using the balance decreasing proof, one (e.g. challenger) can signal to a DeFi protocol that some transaction has occurred. Then the protocol can verify, whether the transaction is legit or it constitutes an illegal action. Based on that, the smart contracts running the protocol can sanction the offender and possibly reward the provider of the proof.

Any transaction can be seen as a balance decreasing transaction, if funds could have left the source address (e.g. due to fees). So even if no funds are sent out, or even the balance is increased, but the address was used as an input, this is considered as a balance decreasing transaction for a source address (such cases can happen with UTXO transactions). 

For this attestation type we assume that the source address being tested is not a contract account, but something called Externally Owned Account (EOA, in Ethereum terminology). Basically that means that this is an address from which funds can be removed only if the owner of the private key for the address signs the payment transaction. 

If the account is a contract account, removal of funds from the contract address could be carried out in many different ways, using the contract calls (like claiming), self-destruct mechanism, etc. Using the self-destruct mechanism, even an address that could be a contract address but nothing is yet deployed on it, can be abused. 
Hence, prior to using the proof in a DeFi protocol, the particular application using the proof should verify, that the account being checked is EOA. Verification whether a certain source address is EOA depends of a chain being used. In non-smart contract chains (like BTC, LTC, DOGE, XRP, ...) all addresses are EOAs. 

A successful attestation is provided by extracting certain data about the transaction, which includes:
- block number
- block timestamp
- transaction hash
- source address
- input utxo, indicating the source address of interest
- spent amount
- [payment reference](https://github.com/flare-foundation/multi-chain-client/blob/main/docs/definitions/payment-reference.md)

Due to technical limitations on UTXO chains, the procedure for the attestation differs according to the existence of the standardized payment reference. In essence, payments with the standardized payment references undergo [full attestation](https://github.com/flare-foundation/multi-chain-client/blob/main/docs/definitions/account-based-vs-utxo-chains.md) while other payments undergo partial attestation. In non-UTXO chains full attestation is always performed.

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
  - description: Index of the source address on UTXO chains.

## Verification rules

### General

- Only transactions that are signed by the source address' account are considered - so called Externally Owned Accounts (EOA). 

### UTXO (BTC, LTC, DOGE) specific

- A valid (single address) must appear on `inUtxo`. Otherwise attestation is rejected.
- Payment reference is calculated only if the attested transaction confirms to ([standardized payment reference](https://github.com/flare-foundation/multi-chain-client/blob/main/docs/definitions/payment-reference.md)). Otherwise the payment reference is 0.
- Full attestation is performed only if the standardized payment reference exists (see [here](https://github.com/flare-foundation/multi-chain-client/blob/main/docs/definitions/account-based-vs-utxo-chains.md) for details). Otherwise partial attestation si performed. In particular that has an impact how `spentAmount` is calculated.
- The value `inUtxo` in response for non-UTXO chains is always 0.

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
- `sourceAddressHash`:
  - type: `bytes32`,
  - description: Hash of the source address as a string. For UTXO transactions with multiple input addresses this is the address that is on the input indicated by `inUtxo` parameter. 
- `spentAmount`:
  - type: `int256`
  - description: The amount that went out of the source address, in the smallest underlying units. In non-UTXO chains it includes both payment value and fee (gas). Calculation for UTXO chains depends on the existence of standardized payment reference. If it exists, it is calculated as `outgoing_amount - returned_amount` and can be negative. If the standardized payment reference does not exist, then it is just the spent amount on the input indicated by `inUtxo`.
- `paymentReference`: 
  - type: `bytes32`
  - description: Standardized payment reference, if it exists, 0 otherwise.


## Comments

For EVM: attesting on a proof is very hard if this is not an EOA account. So we must block Agents from using a non EOA address. This will be forced by having them do one payment for the underlying address before it is approved to be used. Might also be relevant for other non EVM chains. We should research how to force it for other chain types.

Next: [00003 - Confirmed Block Height](./00003-confirmed-block-height-exists.md)
