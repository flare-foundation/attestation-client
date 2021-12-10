import { ChainTransaction, ChainTransactionStatus } from "./ChainTransaction";
import { Hash } from "./Hash";
import { MerkleTree } from "./MerkleTree";
import { getRandom, makeBN } from "./utils";
import { BigNumber } from 'ethers';

export class AttesterEpoch {

    status: 'collect' | 'commit' | 'reveal' | 'done' = 'collect';

    epochId!: number;

    transactions: Map<number, ChainTransaction> = new Map<number, ChainTransaction>();

    merkleTree!: MerkleTree;

    hash!: number;

    random!: number;

    async checkCommit() {
        // todo: check if commit was done
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
            makeBN( this.epochId + 1 ),
            makeBN( this.hash ).xor( makeBN( this.random ) ),
            makeBN( Hash.create(this.random.toString()) ),
            makeBN( 0 ) );
    }

    async reveal() {
        // this.logger.info(`  * Epoch #${epochId} ended`);

        this.status = 'reveal';

        this.submitAttestation(
            // commit index (collect+1)
            makeBN( this.epochId + 1 ),
            makeBN( 0 ),
            makeBN( 0 ),
            makeBN( this.random ) );

        this.status = 'done';
    }

    submitAttestation(bufferNumber: BigNumber, maskedMerkleHash: BigNumber, committedRandom: BigNumber, revealedRandom: BigNumber) {
        // todo: submit to network
    }

}
