[TOC](../README.md)

# Data source

Attestations are verified through authoritative data sources. At the moment attestation types are mostly based on blockchain date. The following sources, including the IDs are currently available:

- 0 - `BTC` - Bitcoin 
- 1 - `LTC` - Litecoin
- 2 - `DOGE` - Dogecoin
- 3 - `XRP` - Ripple
- 4 - `ALGO` - Algorand

The enum defining the source IDs is available [here](../lib/verification/sources/sources.ts).

## Centralized vs. decentralized data sources

Validator nodes of a blockchain from which attestation providers can read data are an example of a decentralized data source. Namely, each attestation provider can essentially read from a different validator node. Decentralized sources may not be in sync at a particular moment. Therefore additional mechanisms should be applied for attestation providers to sync on the state of the data from the decentralized nodes of a source.

On the other hand a centralized source may be some public service that allow for polling data using API access. Since all attestation providers are using the same API access, attestation providers have the same view on data.

## Time dependent data access 

Attestation providers are checking the source at about similar time, but the actual query times may differ in few tens of seconds. Therefore for very fresh data it can happen that some attestation providers who made queries earlier may not perceive the data while others that do the queries just few seconds later would perceive it. Depending on the behavior of the data source and the nature of data the attestation types must be designed in such a way that the attestation providers can achieve a synchronized view on data they are verifying. In other words, attestation types should be designed in such a way that validity of each attestation request is a clear cut decision with the guarantee that other attestation providers will reach the same decision, if they keep to the protocol.

Next: [Account based vs. UTXO model](./account-based-vs-utxo-chains.md)