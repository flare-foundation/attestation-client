# Limiting the number of attestation requests

Submitting an attestation request is a very cheap operation. Consequently, there is a possibility of a DOS attack by sending so many attestation requests that attestation providers get flooded and are not able to verify all the submitted requests in due time. This could render attestation mechanism inoperable for several rounds.

Using the indexer for the majority of verifications enables faster verifications and consequently higher processing throughput for validations. Nevertheless, a flood prevention mechanism should be in place. Note that there are still some cases where data is not read through the indexer database but requires a direct request to blockchain API nodes, which have their own limitations. One such case is with UTXO chains. Once the correct transaction is identified from the indexer database, additional reads of transactions on inputs need to be made, usually to determine input addresses.

In general requests need some bandwidth both on the database and on the blockchain node APIs. These limitations can be different for each data source (blockchain). Also note, that verifications for independent data sources can be fully parallelized.

Therefore, it suffices to set up a limiting mechanism for each data source independently. This mechanism works as follows:

- We assign to each attestation type a weight. If the attestation request uses just a few queries in the indexer database the weight is 1. Otherwise, it is higher.
- We assign to the source (say Bitcoin related requests) the total round weight.
- As events for attestation requests are being read by the attestation client, only a number of the unique attestations that come in for a specific source is considered. Duplicated requests are skipped. If the total round weight is exceeded, the last request considered is the one that by adding its weight we reach or exceed the total weight limit. All later requests are automatically rejected. They can be resubmitted into the next rounds.
- This mechanism introduces a "natural" competition on the Flare network. If a requester wants to submit earlier in the collect phase, it should use a higher gas price to get into block earlier.

In the future we plan to introduce sender-based priority passes or whitelists, if the issue with competition becomes severe. In such a case attestation providers would consider requests sent by specific senders as higher priority.

Next: [Indexer](../indexing/indexer.md)

[Back to home](../README.md)
