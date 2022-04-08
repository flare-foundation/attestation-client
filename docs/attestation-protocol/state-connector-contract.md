
# State connector contract

To facilitate the attestation protocol the `StateConnector` contract is used. This is basically the voting contract, that does the following.

- Manages voting rounds.
- accepts attestation requests all the time. Based on the time of submission each attestation request is mapped to the relevant `collect` phase of the corresponding voting round.
- Accepts commit and reveal submissions by attestation providers, mapping them to the `commit` and `reveal` phases of the relevant voting rounds.
- Counts the votes (attestations) and declares winner attestation for every voting round (in `count` phase).

Note that voting rounds are interlaced. For example, if _T<sub>0</sub>_, _T<sub>1</sub>_, ... are sequential 90s intervals, then the voting round with id 0 has `collect` phase in _T<sub>0</sub>_, `commit` phase in _T<sub>1</sub>_, etc. Simultaneously, voting round with id 1 has the `collect` phase in _T<sub>1</sub>_, `commit` phase in _T<sub>2</sub>_, etc.

Due to the central involvement of the `StateConnector` contract in the attestation protocol, the protocol is also often called the _Stateconnector protocol_.

## Requesting attestations

Attestation request is send as a byte string, that encodes the request, according to the rules stated below. This byte string is sent to `StateConnector` contract using the following function:

```
function requestAttestations(bytes calldata data) external;
```

This is a very simple function - all it does is that emits the event of the form below, that includes `block.timestamp` and re-emits the submitted data.

```
event AttestationRequest(
   uint256 timestamp,
   bytes data
);
```

The data in the request is not stored on blockchain.

## Providing attestations

Attestation provider listen for the emitted `AttestationRequest` events. They collect all the requests for one voting round, parese them and figure out what kind of verifications they need to carry out. For each successfuly validate request attestation hash is calculated. All the attestation hashes for the round are collected into Merkle tree and Merkle root for the round is calculated.

Attestation provider uses a single function for submitting and revealing its vote:

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

This function is called once per attestation round, usually near the end of it. Note that by calling the function one simultaniously sends commit data for one voting round (`maskedMerkleHash` and `committedRandom`) and reveal data for the previous voting round (`revealedRandom`).

`StateConnector` smart contrat operates with sequential 90s windows (`BUFFER_WINDOW = 90`). Here `bufferNumber` indicates the index of the particular window. Given a timestamp `T` one can calculate the corresponding `bufferNumber` with `T` contained in it as follows:

```
bufferNumber(T) = (T - BUFFER_TIMESTAMP_OFFSET)/BUFFER_WINDOW
```

The caller of the function `submitAttestation` must call it with `bufferNumber` corresponding to the time of the call, otherwise the call is rejected.

The relation between voting round id and `bufferNumber` is defined as follows. The first voting round (`roundId = 0`) starts its `collect` phase in window with `bufferNumber = 0`. Hence `bufferNumber` corresponds to the window of the `collect` phase of the voting round with the same index (`roundId`). Hence the `commit` phase of the round with a given `roundId` is in `bufferNumber` equal to `roundId + 1`, the `reveal` phase is in window with `bufferNumber` equal to `roundId + 2` and the `count` phase is in the window with `bufferNumber` equal to `roundId + 3`.

Accordingly, calling `submitAttestation` in a given `bufferNumber` implies we are sending commit data for `roundId` equal `bufferNumber - 1` and reveal data for `roundId` equal `bufferNumber - 2`.

## Songbird and Coston deployments

The currently deployed `StateConnector` contracts on Songbird and Coston networks are available here:

- https://songbird-explorer.flare.network/address/0x3A1b3220527aBA427d1e13e4b4c48c31460B4d91/transactions
- https://coston-explorer.flare.network/address/0x947c76694491d3fD67a73688003c4d36C8780A97/transactions

Both contracts have as the start timestamp set the unix epoch `BUFFER_TIMESTAMP_OFFSET = 1636070400` (November 5th, 2021) and `BUFFER_WINDOW = 90`.
