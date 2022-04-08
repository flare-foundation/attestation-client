# Payment data models on blockchains

There are two major groups of data models in blockchains, the Unspent Transaction Output (UTXO) model and the account based model. Here we address implications of these two models in regard to **native payment** transactions (payments in native - or system - currency). 

## Account based model

While considering native payment transactions, we prefer thinking in terms of classic banking wirings, where funds are sent from one account to another, where one transaction has unique source address and unique receiving address. Such a transaction is called _one-to-one_ payment. Account based blockchains resemble this analogy. Accounts are identified by addresses which in turn are obtained from private keys. Each account has a balance in the native currency. A private key is used to control all native payment transactions that cause balance decreases, which can happen only through one-to-one (native) payments.

In account based model source address and receiving address are always uniquely defined. Spent amount is total amount leaving the source address and it includes the fee. Received amount is the amount the receiving address has received. The transaction is always considered as one-to-one transaction.

# UTXO model

In UTXO based blockchains multi-input and multi-output transactions are used. Each input and output are indicated by respective indices. 
Outputs define to which addresses the funds are sent. If an output is not connected to an input of some transaction, it is deemed to be _unspent transaction output (UTXO)_. UTXOs are means of storing funds and are sent to an address. The holder of the private key corresponding to the address of the UTXO can authorize spending of the funds in UTXO, by signing transactions that use the UTXO as an input. Hence, addresses can thus still be considered as accounts in the banking analogy described above.

## Bitcoin RPC API

In this discussing we will focus primarily on Bitcoin and clones (LTC, DOGE). These have nearly identical RPC API. RPC API returns transaction data, which contains data about outputs (`vout`), among them the receiving addresses. Transaction response has also the transaction input data (`vin`), which contain transaction id and its output index as an identifier of the UTXO being used on the particular input. To obtain the source address, the transaction must be read by making additional RPC API call and the relevant connected output should be read out.  

In essence this means that for obtaining all input addresses for a Bitcoin transaction, one needs to make as many additional calls to RPC API as there are inputs to the transaction. For a specific block, one can read the data about the block and the transactions in the block with a single RPC API call. Counting the number of required transaction reads from RPC API for a Bitcoin block we can easily get over 20,000 reads per block. With reasonable limitations of say 50 calls/s on a RPC API, reading of all the transactions in a block together with all the input transactions could easily take several minutes. 

## Source and receiving addresses for transactions

Due to multi-input-multi-output nature of UTXO blockchain transactions, complex ways of wiring funds are possible. However, we would still like to think of UTXO transactions in terms analogous to banking wirings. 

In general, there is no definition of the "source address" or the "receiving address" in transactions on UTXO blockchains as funds can go from multiple addresses to multiple addresses. However, we might be interested in specific inputs and outputs. Indicating the input index of choice (`inUtxo`) and the output index (`utxo`) in an attestation request helps us in indicating the addresses of interest and thus defining unique the source address and the receiving address, for the purpose of the attestation. 

Given an output of a transaction it can happen that the output has an address defined, empty or in rare cases even multiple addresses (a list of addresses). If the address is not defined or there is more then one address in the list, both cases are considered as the cases where the address does not exist. The address is considered to exist, only if there is exactly one address on the output.

In general, one can just attest for addresses and amounts on the selected input and the selected output. We call this a **partial attestation**. Another alternative is to consider the indices `inUtxo` and `utxo` as pointers to the desired source and the receiving addresses, respectively. As a part of the attestation we then collect the amounts on all inputs that share the same address and subtract from the sum the total of output amounts returning to the same address. In this way we obtain the real (total) spent amount from the source address indicated by `inUtxo`. Note that the spent amount of the transaction can be even net negative. Namely, funds can be taken from other addresses on other inputs and more funds can be returned to the selected source address.

Similarly, we can calculate net total received funds on the receiving address by summing all the amounts on the outputs that go to the receiving address and subtracting the sum of the amounts on all the inputs leaving the same address.

Most often, we are interested in "simple" transactions, from one address to another. Sending from one source address to a receiving address usually involves taking many inputs (as UTXOs) from a source address to be able to input a sufficient amount of funds into the transaction. On the output side, we would prefer to have at most two outputs, one being the receiving address and the other for returning the exceeding funds to the source address. Note that there could be several outputs to the receiving address as well. Such transactions emulate account based transactions where funds are taken from a single account and transferred to the single other account. These kinds of transactions are considered kind of special and we call them _one-to-one_ transactions. Note that such transaction may have additional non-value outputs (for example `OP_RETURN` output with payment reference).

If we do all the checks and sums stated above, we call this a **full attestation**. Full attestation is also able to detect whether we have "simple" (one-to-none) payment transactions.

## Indexing 

As described above, reading all transactions in a block and then all input transactions for each transaction in the block can be quite heavy on RPC API service of a node. In order to optimize the speed of indexing of transactions we chose the following design decision, relevant for UTXO chains. 
- full indexing of transaction inputs is carried out only for transactions with a [standardized payment reference](../payment-reference.md) only. Such transactions can be fully attested without any additional reads from RPC API, since all relevant data are already in the indexer database.
- for all other transactions indexing is done only for transactions obtained for a specific block. Only partial attestations can be carried out on such transactions. Partial attestation involves reading the transaction data from the indexer database and making the aditional call to RPC API to obtain data about the input transaction on the selected transaction input for which attestation is requered.

In general, we encourage community to use standardized payment references since we offer full support for such transactions. 