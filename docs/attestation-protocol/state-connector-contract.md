# State connector contract

The `StateConnector` smart contract is used to manage the attestation protocol. There is one StateConnector contract for each chain type supported by Flare (BTC, LTC, DOGE, XRP, ALGO). The StateConnector is basically the voting contract, which does the following:

- Accepts attestation requests all the time and emits the events that contain the attestation requests and timestamps. Note that the contract does not keep track of any data related to attestation requests. Matching attestation requests to the `collect` phases of the correct voting rounds is done by attestation providers according to the timestamp of the emitted event.
- Accepts commit and reveal submissions by attestation providers, mapping them to the correct voting rounds, consequently mapping them to the correct `commit` and `reveal` phases of the voting rounds.
- Counts the votes (attestations) and declares the winning attestation hash (confirmed Merkle root) for every voting round (in the `count` phase).

Note that voting rounds are interlaced. For example, if _W<sub>0</sub>_, _W<sub>1</sub>_, ... are sequential 90s epoches, then the voting round with id `0` has the `collect` phase in _W<sub>0</sub>_, the `commit` phase in _W<sub>1</sub>_, etc. Simultaneously, the voting round with id `1` has the `collect` phase in _W<sub>1</sub>_, the `commit` phase in _W<sub>2</sub>_, etc.

Additionally, the data submitted by attestation providers per epoch is interlaced; the data sent in window _W<sub>n</sub>_ contains commit data for `roundId = n - 1` and reveal data for `roundId = n - 2`.

## Requesting attestations

An attestation request is sent as a byte string, that encodes the request data, according to certain rules which depend on each attestation type. This byte string is sent to the `StateConnector` contract using the following function:

```solidity
function requestAttestations(bytes calldata data) external;

```

This is a very simple function, all it does is that it emits the event that includes `block.timestamp` and submitted attestation request data.

```solidity
event AttestationRequest(
   uint256 timestamp,
   bytes data
);
```

The data submitted by a request is not stored on the blockchain.

Each [attestation type](../attestation-types/attestation-types.md) defines what data is encoded into the byte string for a specific attestation request.

## Providing attestations

Attestation providers listen for the emitted `AttestationRequest` events. They collect all the requests, match them to the voting rounds according to timestamp, parse them and figure out what kind of verifications they need to carry out. For each successfully validated request, the attestation response is calculated, and from it the attestation hash. All the attestation hashes for the round are collected into a Merkle tree and the Merkle root for the round is thus obtained.

Attestation provider uses a single function on the `StateConnector` contract for submitting and revealing its vote:

```solidity
function submitAttestation(
   uint256 bufferNumber,
   bytes32 maskedMerkleHash,
   bytes32 committedRandom,
   bytes32 revealedRandom
) external returns (
   bool _isInitialBufferSlot
)
```

This function is called once per attestation round, usually near the end of it. Note that by calling the function, one simultaneously sends commit data for one voting round (`maskedMerkleHash` and `committedRandom`) and reveal data for the previous voting round (`revealedRandom`).

`StateConnector` smart contract operates with sequential 90s epoches (`BUFFER_WINDOW = 90`). Here `bufferNumber` indicates the index of the particular epoch. Given a timestamp `T` one can calculate the corresponding `bufferNumber` with the timestamp `T` contained in it as follows:

```solidity
bufferNumber(T) = (T - BUFFER_TIMESTAMP_OFFSET)/BUFFER_WINDOW
```

The caller of the function `submitAttestation` must call it with the `bufferNumber` corresponding to the time of the call, otherwise the call is rejected.

The relation between the voting round id and the `bufferNumber` is described in [Attestation Protocol](attestation-protocol.md).

Calling `submitAttestation` in a given epoch with the `bufferNumber` implies we are sending commit data for `roundId` equal to `bufferNumber - 1` and the reveal data for the `roundId` equal to `bufferNumber - 2`.

## Confirmed Merkle Roots

As of current implementation, the confirmed Merkle root is accessible by looking up into the public array `merkleRoots` in the contract, which is a cyclic buffer of length `TOTAL_STORED_PROOFS` (6720, a week of proofs). Note also that the proof for a given voting round `roundId` is stored at the index `(roundId + 2) % TOTAL_STORED_PROOFS`.

## Songbird and Coston deployments

The currently deployed `StateConnector` contracts on Songbird and Coston networks are available here:

- https://songbird-explorer.flare.network/address/0x3A1b3220527aBA427d1e13e4b4c48c31460B4d91/transactions
- https://coston-explorer.flare.network/address/0x947c76694491d3fD67a73688003c4d36C8780A97/transactions

Both contracts have as the start timestamp set the Unix epoch `BUFFER_TIMESTAMP_OFFSET = 1636070400` (November 5th, 2021) and `BUFFER_WINDOW = 90`.

Note, these are older contracts with less secure (non-copy-proof) commit reveal scheme, that are subject to change soon. The official version of the new copy-proof `StateConnector` contract is expected to be deployed soon and will reside on the address `0x1000000000000000000000000000000000000001`

Next: [Merkle tree and Merkle proof](./merkle-tree.md)

[Back to home](../README.md)
