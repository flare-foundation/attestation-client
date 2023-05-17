# State Connector Contract

The `StateConnector` smart contract is used to manage the attestation protocol. It is a voting contract that does the following:

- Accepts attestation requests continuously and emits events that contain the attestation requests and timestamps. The contract does not keep track of any data related to attestation requests. Matching attestation requests to the correct [`collect` phases](attestation-protocol.md#five-phases-of-a-round) of voting rounds is done by attestation providers according to the timestamps of the emitted events.
- Accepts commit and reveal submissions by attestation providers, mapping them to the correct voting windows, consequently mapping them to the correct [`commit` and `reveal` phases](attestation-protocol.md#five-phases-of-a-round) of the voting rounds.
- Counts the votes (attestations) and declares the winning attestation hash (confirmed Merkle root) for every voting round (in the `count` phase).

Voting rounds are interlaced. For example, if _W<sub>0</sub>_, _W<sub>1</sub>_, ... are sequential 90s voting windows, then the voting round with ID `0` has the `collect` phase in _W<sub>0</sub>_, the `commit` phase in _W<sub>1</sub>_, the `reveal` phase in _W<sub>2</sub>_, and the `count` phase in _W<sub>3</sub>_. Simultaneously, the voting round with ID `1` has the `collect` phase in _W<sub>1</sub>_, the `commit` phase in _W<sub>2</sub>_, and the `reveal` phase in _W<sub>3</sub>_.

Additionally, the data submitted by attestation providers per voting window is interlaced; the data sent in window _W<sub>n</sub>_ contains commit data for `roundId = n - 1` and reveal data for `roundId = n - 2`.

## Requesting Attestations

An attestation request is sent as a byte string, which encodes the request data according to certain rules that depend on each attestation type. This byte string is sent to the `StateConnector` contract using the following function:

```solidity
function requestAttestations(bytes calldata data) external;
```

This is a very simple function. All it does is emit the event that includes `block.timestamp` and submitted attestation request data.

```solidity
event AttestationRequest(
   uint256 timestamp,
   bytes data
);
```

The data submitted by a request is not stored on the blockchain.

Each [attestation type](../attestation-types/attestation-types.md) defines what data is encoded into the byte string for a specific attestation request.

## Providing Attestations

Attestation providers listen for the emitted `AttestationRequest` events. They collect all the requests, match them to the voting rounds according to timestamp, parse them, and figure out what kind of verifications they need to carry out. For each successfully validated request, the attestation response is calculated, and from it the attestation hash. All the attestation hashes for the round are collected into a [Merkle tree](./merkle-tree.md), and the Merkle root for the round is thus obtained.

An attestation provider uses a single function on the `StateConnector` contract for submitting and revealing its vote:

```solidity
function submitAttestation(
   uint256 bufferNumber,
   bytes32 commitHash,
   bytes32 merkleRoot,
   bytes32 randomNumber
) external returns (
   bool _isInitialBufferSlot
)
```

This function is called once per attestation round, usually near the end of it. By calling this function, one simultaneously sends commit data for the current voting round (`commitHash`) and reveal data for the previous voting round (`merkleRoot`, `randomNumber`).

The `StateConnector` smart contract operates with sequential 90s windows (`BUFFER_WINDOW = 90`). Here `bufferNumber` indicates the index of the particular window. Given a timestamp, `T`, one can calculate the corresponding `bufferNumber` with `T` contained in it as follows:

```solidity
bufferNumber(T) = (T - BUFFER_TIMESTAMP_OFFSET)/BUFFER_WINDOW
```

The caller of the `submitAttestation` function must call it with the `bufferNumber` corresponding to the time of the call. Otherwise the call is rejected.

The relation between the voting round ID and the `bufferNumber` is defined as follows: The first voting round (`roundId = 0`) starts its `collect` phase in the voting window with `bufferNumber = 0`. Therefore, the `bufferNumber` corresponds to the voting window of the `collect` phase of the voting round with the same index (`roundId`). The `choose` and `commit` phases of the round with a given `roundId` are in the voting window with the `bufferNumber` equal to `roundId + 1`, the `reveal` phase is in the voting window with the `bufferNumber` equal to `roundId + 2`, and the `count` phase is in the voting window with the `bufferNumber` equal to `roundId + 3`.

Accordingly, calling `submitAttestation` in a given voting window with the `bufferNumber` implies we are sending commit data for `roundId` equal to `bufferNumber - 1` and the reveal data for the `roundId` equal to `bufferNumber - 2`.

## Confirmed Merkle Roots

In the `count` phase, the `StateConnector` verifies `commit data` against `reveal data` and counts the appearances of Merkle roots. If one Merkle root is submitted by more than 50% of attesters, the `StateConnector` emits it as `the confirmed Merkle root` of the voting round. To help reach the consensus we provide [BitVoting](./bit-voting.md).

As of current implementation, the confirmed Merkle root is accessible by looking up the public array `merkleRoots` in the contract, which is a cyclic buffer of length `TOTAL_STORED_PROOFS` (6720, a week of proofs). The proof for a given voting round `roundId`is stored at the index `roundId % TOTAL_STORED_PROOFS`.

## State Connector Contract Deployments

The currently deployed `StateConnector` contracts on Songbird and Coston networks are available here:

- https://songbird-explorer.flare.network/address/0x0c13aDA1C7143Cf0a0795FFaB93eEBb6FAD6e4e3
- https://flare-explorer.flare.network/address/0x1000000000000000000000000000000000000001
- https://coston-explorer.flare.network/address/0x0c13aDA1C7143Cf0a0795FFaB93eEBb6FAD6e4e3
- https://coston2-explorer.flare.network/address/0x1000000000000000000000000000000000000001

Both contracts have the start timestamp set as the Unix epoch `BUFFER_TIMESTAMP_OFFSET = 1636070400` (November 5th, 2021) and `BUFFER_WINDOW = 90`.

Next: [Bit voting](./bit-voting.md)

[Back to home](../README.md)
