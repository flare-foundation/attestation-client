# Limiting the number of attestation requests

Submitting an attestation request is a very cheap operation. But some attestation procedures may involve resource consuming queries and calculations. This may temporary overwhelm attestation providers resources.
Therefore we provide a limiting mechanism for each data source independently. This mechanism works as follows:

- We assign to each attestation type a weight. If the attestation request uses just a few queries in the indexer database, the weight is 1. Otherwise, it is higher.
- We assign to the source (say Bitcoin related requests) the total round weight.
- As events for attestation requests are being read by the attestation client, duplicated requests are skipped, thus, each attestation that comes in for a specific source is considered only once. If the total round weight is exceeded, the last request considered is the one that by adding its weight we reach or exceed the total weight limit. All later requests are automatically rejected. They can be resubmitted into the next rounds.
- This mechanism introduces a "natural" competition on the Flare network. If a requester wants to submit earlier in the collect phase, it should use a higher gas price to get into a block earlier.

Next: [Indexer](../indexing/indexer.md)

[Back to home](../README.md)
