## Attestation protocol

Atestation protocol is a protocol in which facts from other (external) chains, or data sources in general, are proposed for attestation by users, and then the set of default attestation providers vote on them by casting their votes in the form of attestations.

For example, in a simplified setting, a user proposes to the protocol a fact to be confirmed, that the transaction with the transaction id `XYZ` exists in Ripple network. Given such an *attestation request*, each attestation provider will first fetch the data about the transaction from the Ripple network. It will extract from the transaction the information like transaction id, block number, block timestamp, source address, destination address, transfered amount, payment reference, etc. The data used are collectively called *attestation data*. A 32-byte hash will be produced using the attestation data, serving as the *attestation hash*, or shortly *attestation*. Such an attestation will be submitted to the protocol. Several attestation providers will do the same in parallel and submit their attestations. The protocol will collect the submitted attestations and if majority of the attestations are the same, the protocol will confirm the majority attestation hash, yielding the *confirmed attestation hash* (or *confirmed attestation*). 

Then if any user would provide attestation data, say to some contract, such a contract can calculate the hash of the attestation data and compare it to the confirmed attestation hash. In case of a match, the contract has the confirmation that the provided attestation data is valid and it can act upon that. 

In our example, the transaction with the transaction id `XYZ` in Ripple network could be a payment for some service regulated by a contract on Flare network, for which one needs to pay 100 XRP to a specific Ripple address. A user would first request the contract for the service. The contract would issue a requirement to pay 100 XRP to a specific address given a specific payment reference. The user would then carry out the payment in Ripple network, producing the payment transaction with the transaction id `XYZ`. Then it would then request the attestation protocol to attest for the transaction which would trigger the procedure described above. Once the confirmed attestation hash is obtained by the protocol, the user would submit the attestation data for transaction `XYZ` to the contract. Contract would hash the attestation data with its requirements (e.g. 100 XRP, required receiving address, correct timing, correct payment reference, etc.). Then it would calculate the hash of the provided attestation data and compared it to the confirmed attestation hash obtained by the attestation protocol. If everything matches, the contract has the proof that the payment was correct and it can unlock the service for the user.

A simplified version of the attestation protocol described above implies that an efficient implementation of the protocol should be organized as a sequence of voting rounds, where in each voting round, attestation providers vote not just on a single fact, but on a package of facts. Here we see a clear analogy with the classic part of each blockchain consensus algorithm, where validators try to reach the consensus for the next proposed block. Thus multiple facts can be collected together and put for a vote in a given voting round. Attestation hashes of each verified fact can be assembled using a Merkle tree into a single hash (Merkle root) which is submitted by each attestation provider for the voting round. Proving a specific attestation would in this case require combination of the confirmed attestation hash (Merkle root) and the specific Merkle proof, obtained for a specific attestation request.

A secure implementation of the protocol should also take care of preventing copying the casted votes (attestations), in a similar manner as elections are organized. In particular, this forces attestation providers to cast genuine attestations, obtained by actually checking the data on other chains. Hence a commit-reveal scheme should be applied.


The implemented attestation protocol consists of a sequence of rounds. Each round starts every 90s and its sequential index is its round id. A round starts at a certain time and after that it evolves through the following four phases, each lasting 90s:
- `collect` - the first 90 seconds. Attestation requests are being collected. 
- `commit` - the next 90 seconds. Attestation providers are carrying out verifications, calculating attestations and submitting masked commit hashes of their votes before the end of this phase. Each attestation provider calculates Merkle root for the attestations of the round. Requests that cannot be verified (like non-existent transaction id) are omitted (no attestation hash is produced). Also each attestation providers chooses a big random number which it keeps hiden in this phase. Then it calculates XOR of the Merkle root and the random number, obtaining *masked attestation*. Attestation providers submit masked attestations, which act as commiting to the vote.
- `reveal` - the next 90 seconds. Attestation providers are revealing their votes. They are disclosing their random number by sending them to the protocol. 
- `count` - starts immediately after the end of the reveal phase. Combining each masked attestation with the corresponding revealed random attestations (Merkle roots) of all attestation providers are obtained. The protocol finds the majority of the same hashes and declares this the confirmed attestation. Majority is at the moment set as 50%+ of all possible votes (the set of all attestation providers is known in advance). In case the there is no majority attesttion, the voting round has failed and no attestation request from that round gets confirmed. Users can resubmit requests in later rounds.

## State connector contract

To facilitate the attestation protocol the `StateConnector` contract is used. This is basically the voting contract, that does the following.
- Manages voting rounds.
- accepts attestation requests all the time. Based on the time of submission each attestation request is mapped to the relevant `collect` phase of the corresponding voting round.
- Accepts commit and reveal submissions by attestation providers, mapping them to the  `commit` and `reveal` phases of the relevant voting rounds.
- Counts the votes (attestations) and declares winner attestation for every voting round (in `count` phase).

Note that voting rounds are interlaced. For example, if $T_0$, $T_1$, ... are sequential 90s intervals, then the voting round with id 0 has `collect` phase in $T_0$, `commit` phase in $T_1$, etc. Simultaneously, voting round with id 1 has the `collect` phase in $T_1$, `commit` phase in $T_2$, etc. 

Due to the central involvement of the `StateConnector` contract in the attestation protocol, the protocol is also often called the *Stateconnector protocol*.

### Requesting attestations

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
### Providing attestations

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

This function is called once per attestation round, usually near the end of it.
Here `bufferNumber` indicates the round id (the round with current collect phase), `maskedMerkleHash` and `committedRandom` are represent the commit data in commit-reveal 
scheme for the previous round id `bufferNumber - 1`, while `revealedRandom` is represents 
the reveal data for the round id `bufferNumber - 2`