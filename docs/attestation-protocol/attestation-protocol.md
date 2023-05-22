# Attestation Protocol

The **attestation protocol** (also called **State Connector protocol**) is a protocol in which facts from external blockchains, or external data sources in general, are proposed for attestation by users. The set of **default attestation providers** then votes on the facts by sending attestations.

In order to understand how the attestation protocol works, consider a simplified setting: A user proposes a fact to be confirmed by the protocol, e.g., the transaction with the transaction ID `XYZ` exists in the Ripple network. Given such an **attestation request**, each attestation provider will first fetch the data about the transaction from the Ripple network. Then it extracts information from the transaction data, such as the transaction ID, block number, block timestamp, source address, destination address, transferred amount, payment reference, etc. The extracted data are collectively called **attestation response**. A 32-byte **attestation hash** (or **attestation**) is then produced using the attestation response and submitted to the protocol. Several attestation providers do the same in parallel and submit their attestations. The protocol then collects the submitted attestations and, if the majority of the attestations are the same, the protocol accepts and confirms the majority attestation hash, yielding the **confirmed attestation hash** (or the **confirmed attestation**).

Later, if a user provides an attestation response to a contract, such a contract can calculate the hash of the attestation response data and compare it to the confirmed attestation hash. In the case of a match, the contract would get the confirmation that the provided attestation response data is valid and it can act upon that accordingly.

## A Use Case

Imagine that the transaction from our example above is a payment for some service managed by a contract on the Flare network, for which one needs to pay 100 XRP to a specific Ripple address. In the full workflow, the user would first request the contract for access to the service. The contract would then issue a requirement to pay 100 XRP to a specified address given a specified payment reference. The user would carry out the payment in the Ripple network, producing the payment with the transaction ID `XYZ`. Then it would request the attestation protocol to attest for the transaction, which would trigger the procedure described above.

Once the confirmed attestation hash is obtained by the protocol, the user would submit the attestation response data for the `XYZ` transaction to the contract. The contract would check the attestation response data against its requirements (e.g., 100 XRP are required to be sent to the specified receiving address, within the correct time, with the correct payment reference, etc.). Then it would calculate the attestation hash of the provided attestation response data and compare it to the confirmed attestation hash obtained by the attestation protocol. If everything matches, the contract has proof that the payment was correct and it can unlock the service for the user.

## Voting Rounds and Merkle Root

The simplified version of the attestation protocol described above indicates that an efficient implementation of the protocol should be organized as a sequence of voting rounds.  In each voting round, attestation providers vote not just on a single attestation request but on a package of attestation requests. Here we see a clear analogy for the usual approach to any blockchain consensus algorithm, where validators try to reach the consensus not just for a single transaction, but for a package of transactions that are accepted in a block.

Multiple attestation requests can be collected and put up for vote in a single voting round. Attestation hashes of all verified attestation response data can be assembled using a Merkle tree into the single hash (the **Merkle root**), which is submitted by each attestation provider for the voting round. Proving a specific attestation would, in this case, require a combination of attestation response data, the confirmed attestation hash (the Merkle root), and the specific Merkle proof, obtained for the specific attestation response.

A secure implementation of the protocol, using a proper commit-reveal scheme, prevents copying the votes (attestations), similar to the way elections are organized.

### Commit-Reveal Scheme

A commit-reveal scheme for voting consists of a 2-phase procedure for sending the data in such a way that:

- In the **commit phase**, we can send **commit data** that contains the proof of the existence of the real data, but does not disclose the data itself. The commit data is calculated from Merkle root, a random number (to mask the Merkle root) and the sender's address (to prevent hash copying). Sending the commit data is possible only during this phase.
- Once the commit phase is finished, the **reveal phase** starts. In this phase, the voters can disclose their data (**reveal data**), which should match the **commit data**.

## Voting Rounds

The implemented attestation protocol is managed by the [`StateConnector`](state-connector-contract.md) smart contact and [`BitVoting`](bit-voting.md) smart contract. Voting activities are organized using sequential 90-second **voting windows** enumerated by a sequential ID, the `bufferNumber`. Each round starts with the particular voting window. The `roundId` for the round is the `bufferNumber` of the voting start window. A round evolves through the five phases explained below (in four sequential voting windows). Sending the commit-reveal data is carried out only once per voting window, usually `commitTime` seconds before the end (see [`attester-config.json`](configs/.install/templates/attester-config.json)). Note that the voting data is sent for two voting rounds, commit data for one, and reveal data for the next one. Before the commit-reveal voting another pre-voting phase is carried out, called [**choose**](bit-voting.md). This phase is used to agree on which attestations should be put into the Merkle tree while voting in commit-reveal scheme.

### Two Sets of Attestation Providers

In the current implementation of the attestation protocol the attestation providers are divided into two sets:

- **default set**: A selected set of 9 attestation providers that carry out bit-voting and commit-reveal voting. The accepted hash is defined by the majority Merkle root from the default set.
- **local sets**: Each validator or observation node can configure a set of local attestation providers. A local attestation provider is usually not a member of the default set. They are not involved in bit-voting, but they do participate in commit-reveal voting, where their votes do not influence the default set voting result. If the majority of the local set at a specific node produces a different Merkle root voting result than the default set, the node forks out of the network (rejects the Merkle root accepted by the default set). Local sets are used as an additional security mechanism.

### Five Phases of a Round

The breakdown of phases of a voting round is as follows:

- `collect`: The first voting window with a given `bufferNumber` that defines the voting round's `roundId`. In this phase, attestation requests are being collected. After attestation requests are collected, the verification process is started.
- `choose`: The first half of the next voting window (`bufferNumber + 1`). Before the end of the choose phase, the members of the default set carry out the vote on which attestations should be included in the final vote. Each member of the default set sends a bit vector with bits corresponding to attestation requests in the order of arrival (with duplicates removed). These *bit-votes* are sent to a [BitVoting](./bit-voting.md) contract, where they are emitted as events. Based on the votes submitted, each attestation provider can use a deterministic algorithm to calculate the voting result and thereby know which attestations to include in the Merkle tree and attest on.
- `commit`: The second half of the voting window `bufferNumber + 1`. In this phase, attestation providers finish out verifications, calculating the attestations, building the Merkle tree based on the result of the `choose` phase, calculating the Merkle root, and sending the **commit data**. The **commit data** is sent with the **reveal data** for the previous round (`roundId - 1`).
- `reveal`: The next voting window (`bufferNumber + 2`). The attestation providers reveal their votes by sending the **reveal data** that matches the submitted **commit data** in the previous voting window. The **reveal data** is sent with the **commit data** for the next round (`roundId + 1`).
- `count`: Starts immediately after the end of the `reveal` phase, at the beginning of the next voting window (`bufferNumber + 3`). The reveal data sent by each attestation provider is verified against the commit data they sent, thus verifying the validity. All Merkle roots are now disclosed. The protocol finds the majority Merkle root and declares it the confirmed attestation (confirmed Merkle root). The majority threshold is set to 50%+ of all possible votes (the set of all default attestation providers is known in advance). In their case, where there is no majority Merkle root, the voting round has failed, and no attestation request from that round gets confirmed. Users can resubmit attestation requests in later rounds.

Next: [State connector contract](./state-connector-contract.md)

[Back to home](../README.md)
