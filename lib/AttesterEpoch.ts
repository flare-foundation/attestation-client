import assert from "assert";
import { BigNumber } from "ethers";
import { Logger } from "winston";
import { ChainTransaction, ChainTransactionStatus } from "./ChainTransaction";
import { Hash } from "./Hash";
import { MerkleTree } from "./MerkleTree";
import { getRandom, makeBN } from "./utils";

export enum AttesterEpochStatus {
  collect,
  commit,
  reveal,
  completed,
}

export enum AttestStatus {
  collecting,
  comitted,
  revealed,
}

export class AttesterEpoch {

  logger: Logger;
  status: AttesterEpochStatus = AttesterEpochStatus.collect;
  epochId: number;
  transactions: Map<number, ChainTransaction> = new Map<number, ChainTransaction>();
  merkleTree!: MerkleTree;
  hash!: BigNumber;
  random!: BigNumber;
  attestStatus: AttestStatus;

  transactionsProcessed: number = 0;

  constructor(epochId: number, logger: Logger) {
    this.epochId=epochId;
    this.logger = logger;
    this.status = AttesterEpochStatus.collect;
    this.attestStatus = AttestStatus.collecting;
    this.logger.info(`  * AttestEpoch #${this.epochId} (0) collect`);
  }

  startCommit() {
    this.logger.info(`  * AttestEpoch #${this.epochId} (1) commit`);
    this.status = AttesterEpochStatus.commit;

    if( this.status===AttesterEpochStatus.commit )
    {
      this.commit();
    }
  }

  startReveal() {
    this.logger.info(`  * AttestEpoch #${this.epochId} (2) reveal`);
    this.status = AttesterEpochStatus.reveal;
  }

  completed() {
    this.logger.info(`  * AttestEpoch #${this.epochId} completed`);
    this.status = AttesterEpochStatus.completed;
  }

  processed(tx: ChainTransaction)
  {
    this.transactionsProcessed++;

    assert( this.transactionsProcessed<=this.transactions.size);

    if( this.transactionsProcessed===this.transactions.size)
    {
      this.logger.error(`     * AttestEpoch #${this.epochId} all transactions processed ${this.transactions.size}`);
      if( this.status===AttesterEpochStatus.commit )
      {
        this.commit();
      }
    }
    else
    {
      this.logger.error(`     * AttestEpoch #${this.epochId} transaction processed ${this.transactionsProcessed}/${this.transactions.size}`);
    }
  }

  async commit() {

    if (this.status !== AttesterEpochStatus.commit) {
      this.logger.error(`  ! AttestEpoch #${this.epochId} cannot commit (wrong epoch status ${this.status})`);
      return;
    }
    if (this.attestStatus !== AttestStatus.collecting) {
      this.logger.error(`  ! AttestEpoch #${this.epochId} cannot commit (wrong attest status ${this.attestStatus})`);
      return;
    }

    this.logger.info(`  * AttestEpoch #${this.epochId} commited`);
    this.attestStatus = AttestStatus.comitted;

    // collect ordered validated transaction hashes
    const validatedTransactions: string[] = new Array<string>();

    for (const tx of this.transactions.values()) {
      if (tx.status === ChainTransactionStatus.valid) {
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
      makeBN(this.epochId + 1),
      this.hash.xor(this.random),
      makeBN(Hash.create(this.random.toString())),
      makeBN(0)
    );
  }

  async reveal() {

    if (this.status !== AttesterEpochStatus.reveal) {
      this.logger.error(`  ! AttestEpoch #${this.epochId} cannot reveal (not in reveal epoch status ${this.status})`);
      return;
    }
    if (this.attestStatus !== AttestStatus.comitted) {
      this.logger.error(`  ! AttestEpoch #${this.epochId} cannot reveal (not commited ${this.attestStatus})`);
      return;
    }

    this.submitAttestation(
      // commit index (collect+1)
      makeBN(this.epochId + 1),
      makeBN(0),
      makeBN(0),
      this.random
    );

    this.attestStatus = AttestStatus.revealed;
  }

  submitAttestation(bufferNumber: BigNumber, maskedMerkleHash: BigNumber, committedRandom: BigNumber, revealedRandom: BigNumber) {
    // todo: submit to network
  }
}
