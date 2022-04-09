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

Validator nodes of a blockchain from which attestation providers can read data are an example of a decentralized data source. Namely, each attestation can essentially read from a different validator node.  