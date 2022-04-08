[TOC](../README.md)
# Limiting the number of attestation requests

Submitting an attestation request is a very cheap operation. Conseqently, there is a possibility of a DOS attack by sending so many attestation requests that attestation providers would get overflooded and would not be able to verify all the submitted requests in due time. This could render attestation mechanisme inoperable for several rounds.

Using the indexer for the majority of verifications enables faster verifications and consequently higher processing througput for validations. Nevertheless an overflooding prevention mechanism to prevent the case described above should be in place. Note that there are still some cases where data is not read through the indexer database but require a direct request to a blockchain API nodes. 

One of such cases is with UTXO chains. Once the correct transaction is identified from the indexer database, additional reads of transactions on inputs need to be made. Thus we could argue that such request occupy some bandwidth both on database and on APIs. Note that these limitation can be set independently for each data source. Namely, for each data source (or blockchain) we use different API nodes. Though we can use the same database on the same machine, this can be clearly easily separated. Hence we can argue that limitation on one source do not influence limitations on the other, hence attestation request verification related to different sources can be fully parallelized.

Therefore, it suffices to set up a limiting mechanism for each data source independently. The mechanism works as follows.
- We assign to each attestation type a weight. If the attestation request uses just a few queries in the indexer database the weight is 1. Otherwise it is higher.
- We assign to the source (say Bitcoin related requests) the total round weight. 
- As events for attestation request are being read by the attestation client only a number of the first attestation for a specific source is considered. Duplicate requests are considered only once. The last request considered is the one, that by adding its weight we overflow the total weight limit. All later requests are automatically rejected. They can be resubmitted into the next rounds.
- This mechanism introduces a "natural" competition on the Flare network. If a requester wants to submit earlier in the collect phase, it should use higher gas price to come in earlier blocks. Specifically, the request submitters that really need to be in a specific attestation round, should use higher gas price and possibly try to submit just before the beginning of the `collect` phase of the attestation round, monitor the timestamp of the event and even try to resubmit, or even submit in parallel from several accounts.


In future we might introduce sender based priority passes or whitelists, if the issue with competition becomes severe. In such a case attestation providers would consider requests sent by specific senders as higher priority.

## Global dynamic attestatons 

... TODO