import { ChainTransaction, ChainTransactionStatus } from "./ChainTransaction";
import { Hash } from "./Hash";
import { MerkleTree } from "./MerkleTree";
import { getRandom } from "./utils";


export class AttesterEpoch {

    status: 'collect' | 'commit' | 'reveal' | 'done' = 'collect';

    epochId!: number;

    transactions: Map<number, ChainTransaction> = new Map<number, ChainTransaction>();

    merkleTree!: MerkleTree;

    hash!: number;

    random!: number;

    async checkCommit() {
    }

    async commit() {
        // this.logger.info(`  * Epoch #${epochId} ended`);

        this.status = 'commit';

        // todo: wait until ALL are processed

        // collect ordered validated transaction hashes
        const validatedTransactions: string[] = new Array<string>();

        for (const tx of this.transactions.values()) {
            if (tx.status === ChainTransactionStatus.valid ) {
                validatedTransactions.push(tx.transactionHash);
            }
        }

        // how to sort!
        // https://web3js.readthedocs.io/en/v1.2.11/web3-eth-contract.html#getpastevents  myContract.getPastEvents
        // 1. blockNumber
        // 2. transactionIndex
        // 3. signature
        // put all in BN and sort

        // create merkle tree
        this.merkleTree = new MerkleTree(validatedTransactions);

        this.random = await getRandom();

        this.submitAttestation(
            // commit index (collect+1)
            this.epochId + 1,
            this.hash ^ this.random,
            Hash.createHash1(this.random),
            0);
    }

    async reveal() {
        // this.logger.info(`  * Epoch #${epochId} ended`);

        this.status = 'reveal';

        this.submitAttestation(
            // commit index (collect+1)
            this.epochId + 1,
            0,
            0,
            this.random);

        this.status = 'done';
    }

    submitAttestation(bufferNumber: number, maskedMerkleHash: number, committedRandom: number, revealedRandom: number) {
        // todo: submit to network
    }

}