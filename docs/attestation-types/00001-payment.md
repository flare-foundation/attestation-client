
# 00001 - Payment

[Definition file](../../lib/verification/attestation-types/t-00001-payment.ts)

## Description

The purpose of this attestation type is to provide a general attestation of a native payment transaction. Native payment on a blockchain is an elementary payment with the system currency, where funds are sent from one address to another. In case of chains based on the UTXO model, a specific generalization is applied.

Attestation is provided by extracting certain data about the transaction, which includes:
- block number
- block timestamp
- payment reference
- source address
- receiving address
- spent amount
- received amount
- whether transaction is sending from a single address to a single other address
- transaction status (accounts for failed transactions that are recorded on blockchain)

While considering native payment transactions we prefer thinking in terms of classic banking wirings. Account based blockchain resemble this analogy. On the other hand, UTXO based chains allow for more complex transactions.
### UTXO blockchains 

On UTXO blockchains multi-input and multi-output transactions are used. Bitcoin RPC API returns transaction data, which contains data about outputs. Destination addresses are available in the output data fields (`vout`). In the transaction input data (`vin`), only a reference to a transaction producing the relevant output, and the index of the output, are provided. This implies that in order to obtain the input address for a specific input, one needs to read the input transaction data and obtain the address from the relevant connected output. In essence this means that for obtaining all input addresses for a Bitcoin transaction, one needs to make as many additional calls to RPC API as there are inputs to the transaction. For a specific block, one can read the data about the block and the transactions in the block with a single RPC API call. Counting the number of required transaction reads from RPC API for a Bitcoin block we can easily get over 20,000 reads per block. With reasonable limitations of say 50 calls/s on a RPC API, reading of all the transactions in a block together with all the input transactions could easily take several minutes. 

In order to optimize the speed and indexing of transactions we have decided for the following design decision, relevant for UTXO chains. The indexers should index all input transactions for transactions that have a [standardized payment reference](../payment_reference.md) only. In general, we encourage community that is using the attestation protocol to use standardized payment references as we offer full support for such transactions. For transactions without standardized payment references we do not index input transactions. Verification for such transactions on UTXO chains is therefore somewhat weaker (see the rules).

Due to multi-input-multi-output nature of UTXO blockchain transactions, complex types of wiring funds are possible. Most often, we are interested in "simple" transactions, from one address to another. Sending from one source address to a receiving address usually involves taking many inputs of UTXOs from source address to be able to input a sufficient amount of funds into the transaction. On the output side, we would prefer to have at most two outputs, one being the receiving address and the other for returning the exceeding funds to the source address. Note that there could be several outputs to the receiving address as well. Such transactions emulate account based transactions where funds are taken from a single account and transferred to the single other account. This kinds of transactions are considered kind of special, especially if they have a standardized payment reference (additional output with `OP_RETURN`). During the attestation process it is verified whether the transactions is of this form and this is indicated in the attestation field `oneToOne`.

In general, there is no definition of a "source address" or "receiving address" in transactions on UTXO blockchains as funds can go from multiple addresses to multiple addresses. However, we might be interested in specific inputs and outputs. Indicating the input index of choice (`inUtxo`) and the output index (`utxo`) in an attestation request helps us in indicating the addresses of interest and thus defining unique source address and receiving address, for the purpose of the specific attestation. 
In general, one can just attest for addresses and amounts on selected input and selected output. However, in the case of transactions with standardized payment reference we can extend the attestation as follows. Since such transactions have fully indexed inputs, we can consider the indices `inUtxo` and `utxo` as pointers to desired source and receiving addresses, respectively. As a part of the attestation we then collect the amounts on all inputs that share the same address and subtract from the sum the total of output amounts returning to the same address. In this way we obtain real (total) spent amount from the source address indicated by pointing an input by `inUtxo`. Note that the spent amount of the transaction can be even net negative. Namely, funds can be taken from other addresses in other inputs and more funds can be returned to the selected source address.

Similarly, we can calculate net total received funds on the receiving address by summing all the amounts on the outputs that go to the receiving address and subtracting the sum of the amounts on all the inputs leaving the same address.

Given an output of a transaction it can happen that the output has an address defined, empty or in rare cases even multiple addresses (a list of addresses). If address is not defined or there is more then one address in the list, both cases are considered as the cases where the address does not exist. The address is considered to exist, only if there is only one address on the output.

## Request format

Beside the standard fields (`attestationType`, `sourceId` and `dataAvailabilityProof`) the request for Payment attestation type contains in addition fields `id`, `utxo` and `inUtxo`.

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
  - description: Index of the receivingAddress on UTXO chains.
- `inUtxo`:
  - size (bytes): 1
  - internal type: `NumberLike`
  - description: Index of the sourceAddress on UTXO chains.
- `id`:
  - size (bytes): 32
  - internal type: `ByteSequenceLike`
  - description: Transaction hash to search for.
- `dataAvailabilityProof`:
  - size (bytes): 32
  - internal type: `ByteSequenceLike`
  - description: Block hash of the confirmation block for the searched transaction (e.g. at least 6 blocks after the block with transaction). Determines the upper bound in terms of blocks for the search.

## Verification rules

- If the payment status is failure (1 or 2), the received amount should be 0 and the spent amount should be only the gas/fee spent.
- The transaction to be attested must be signed by the key corresponding to the source address. 
- Consequently, no smart contract addresses are allowed for the sender address 

### UTXO (BTC, LTC, DOGE) chains

- Payment reference is calculated from `OP_RETURN` output. For a valid payment reference, there must be only one `OP_RETURN` output and the value must be long 32 bytes ([standardized payment reference](../payment_reference.md)). In all other cases it is deemed that the payment reference does not exist.
- Source address is determined by the address on the input with the index `inUtxo`. 
- If there is no address on the indicated input (`inUtxo`), then the source address does not exist and it is indicated in the data hash as 0 hash. Spent amount is also 0 in this case. Note that if multiple addresses exist on an input (a list of addresses) this is deemed as non-existence of the source address.
- Receiving address is indicated by the output (`utxo`) the index `utxo`. 
- If the address on the indicated output (`utxo`) does not exist, then the receiving address does not exist and it is indicated in the data hash as 0 hash. Received amount is the amount on the indicated output. Note that if multiple addresses exist on the output indicated output, this is deemed as non-existence of the receiving address.
- The rules for attestation differ depending on whether standardized payment reference exists. 
- If standardized payment reference does not exist:
   - if the source address exists, then the spent amount is equal exactly the value that is taken from the input indicated by `inUtxo`. Otherwise the spent amount is 0.
   - If the receiving address exists, then the received amount is equal exactly the value on the indicated output. Otherwise the received amount is 0.
   - transaction is never on-to-one.
- Otherwise, if standardized payment reference exists:
  - if the source address exists, then spent amount is calculated as the sum of all inputs from that address subtracted by all the return amounts on outputs to that address. Otherwise the spent amount is 0.
  - If the receiving address exists, then the received amount is calculated as the sum of all the amounts on the outputs that go to the receiving address subtracted by the sum of all the amount taken from the inputs that leave that address. Otherwise the received amount is 0.
  - the payment is one-to-one (`oneToOne` is 1) only if the source address exists and it appears on all the inputs and the receiving address appears on all the outputs, except the one with `OP_RETURN` (standardised payment reference) and outputs that return to the source address.
- status is always `0 - Success`, since only successful transactions can be mined into blocks on BTC/LTC/DOGE chains.

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
- `receivingAddress`:
  - type: `bytes32`
  - description: Hash of the receiving address as a string (the one indicated by the `utxo` parameter).
- `paymentReference`: 
  - type: `bytes32`
  - description: Chain dependent extra data (e.g. memo field, destination tag, tx data) For minting and redemption payment it depends on request id, for to-pup and self-mint it depends on the agent vault address. See PaymentReference.sol for details of payment reference calculation.
- `spentAmount`:
  - type: `int256`
  - description: The amount that went out of the `sourceAddress`, in smallest underlying units. It includes both payment value and fee (gas). For utxo chains it is calculated as `outgoing_amount - returned_amount` and can be negative, that's why signed `int256` is used.
- `receivedAmount`:
  - type: `int256`
  - description: The amount the receiving address received, in smallest underlying units. Can be negative in UTXO chains.
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

## Comments
