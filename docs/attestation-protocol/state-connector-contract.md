[TOC](../README.md)
# State connector contract

The `StateConnector` smart contract is used to manage the attestation protocol. This is basically the voting contract, that does the following.

- Accepts attestation requests all the time and emits the events that contain the attestation requests and timestamps. Note that the contract does not keep track of any data related to attestation requests. Matching attestation requests to the correct `collect` phases of voting rounds is done by attestation providers according to the timestamps of the emitted events.
- Accepts commit and reveal submissions by attestation providers, mapping them to the correct voting windows, consequently mapping them to the correct `commit` and `reveal` phases of the voting rounds.
- Counts the votes (attestations) and declares the winning attestation hash (confirmed Merkle root) for every voting round (in the `count` phase).

Note that voting rounds are interlaced. For example, if _W<sub>0</sub>_, _W<sub>1</sub>_, ... are sequential 90s voting windows, then the voting round with id `0` has the `collect` phase in _W<sub>0</sub>_, the `commit` phase in _W<sub>1</sub>_, etc. Simultaneously, the voting round with id `1` has the `collect` phase in _W<sub>1</sub>_, the `commit` phase in _W<sub>2</sub>_, etc.

Additionaly the data submitted by attestation providers per voting window is interlaced; the data sent in window _W<sub>n</sub>_ contains commit data for `roundId = n - 1` and reveal data for `roundId = n - 2`.

## Requesting attestations

An attestation request is sent as a byte string, that encodes the request data, according to certain rules which depend on definition of attestation types. This byte string is sent to the `StateConnector` contract using the following function:

```
function requestAttestations(bytes calldata data) external;
```

This is a very simple function - all it does is that it emits the event that includes `block.timestamp` and submitted attestation request data.

```
event AttestationRequest(
   uint256 timestamp,
   bytes data
);
```

The data submitted by a request is not stored on blockchain.

Each [attestation type](../attestation-types/attestation-types.md) defines what data are encoded into the byte string for a specific attestation request.

## Providing attestations

Attestation providers listen for the emitted `AttestationRequest` events. They collect all the requests, match them to the voting rounds according to timestamp, parse them and figure out what kind of verifications they need to carry out. For each successfully validated request, the attestation response is calculated, and from it the attestation hash. All the attestation hashes for the round are collected into a Merkle tree and the Merkle root for the round is thus obtained.

Attestation provider uses a single function on the `StateConnector` contract for submitting and revealing its vote:

```
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

`StateConnector` smart contract operates with sequential 90s windows (`BUFFER_WINDOW = 90`). Here `bufferNumber` indicates the index of the particular window. Given a timestamp `T` one can calculate the corresponding `bufferNumber` with the timestamp `T` contained in it as follows:

```
bufferNumber(T) = (T - BUFFER_TIMESTAMP_OFFSET)/BUFFER_WINDOW
```

The caller of the function `submitAttestation` must call it with the `bufferNumber` corresponding to the time of the call, otherwise the call is rejected.

The relation between the voting round id and the `bufferNumber` is defined as follows. The first voting round (`roundId = 0`) starts its `collect` phase in the voting window with `bufferNumber = 0`. Hence the `bufferNumber` corresponds to the voting window of the `collect` phase of the voting round with the same index (`roundId`). The `commit` phase of the round with a given `roundId` is in the voting window with the `bufferNumber` equal to `roundId + 1`, the `reveal` phase is in the voting window with the `bufferNumber` equal to `roundId + 2` and the `count` phase is in the voting window with the `bufferNumber` equal to `roundId + 3`.

Accordingly, calling `submitAttestation` in a given voting window with the `bufferNumber` implies we are sending commit data for `roundId` equal `bufferNumber - 1` and the reveal data for the `roundId` equal `bufferNumber - 2`.

## Confirmed Merkle Roots

As of current implementation, the confirmed Merkle root is accessible by looking up into the public array `merkleRoots` in the contract, which is a cyclic buffer of length `TOTAL_STORED_PROOFS` (6720 - a week of proofs). Note also that the proof for a given voting round `roundId`is stored at the index `(roundId + 2) % TOTAL_STORED_PROOFS`.
## Songbird and Coston deployments

The currently deployed `StateConnector` contracts on Songbird and Coston networks are available here:

- https://songbird-explorer.flare.network/address/0x3A1b3220527aBA427d1e13e4b4c48c31460B4d91/transactions
- https://coston-explorer.flare.network/address/0x947c76694491d3fD67a73688003c4d36C8780A97/transactions

Both contracts have as the start timestamp set the unix epoch `BUFFER_TIMESTAMP_OFFSET = 1636070400` (November 5th, 2021) and `BUFFER_WINDOW = 90`.

Note, these are older contracts with less secure (non-copy-proof) commit reveal scheme, that are subject to change soon. The official version of the new copy-proof `StateConnector` contract is expected to be deployed soon and will reside on the address `0x1000000000000000000000000000000000000001`

Next: [Merkle tree and Merkle proof](./merkle-tree.md)
