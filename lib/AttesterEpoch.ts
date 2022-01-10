import assert from "assert";
import BN from "bn.js";
import { Logger } from "winston";
import { Attestation, AttestationStatus } from "./Attestation";
import { Attester } from "./Attester";
import { AttesterWeb3 } from "./AttesterWeb3";
import { Hash } from "./Hash";
import { getTimeSec } from "./internetTime";
import { MerkleTree } from "./MerkleTree";
import { getRandom, toBN } from "./utils";

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
  attestations = new Array<Attestation>();
  merkleTree!: MerkleTree;
  hash!: string;
  random!: BN;
  attestStatus: AttestStatus;
  attesterWeb3: AttesterWeb3;

  transactionsProcessed: number = 0;

  constructor(epochId: number, logger: Logger, attesterWeb3: AttesterWeb3) {
    this.epochId = epochId;
    this.logger = logger;
    this.status = AttesterEpochStatus.collect;
    this.attestStatus = AttestStatus.collecting;
    this.logger.info(` * AttestEpoch #${this.epochId} (0) collect`);
    this.attesterWeb3 = attesterWeb3;
  }

  addAttestation(attestation: Attestation) {
    attestation!.onProcessed = (tx) => {
      this.processed(attestation);
    };
    this.attestations.push(attestation);
  }

  startCommit() {
    this.logger.info(` * AttestEpoch #${this.epochId} (1) commit`);
    this.status = AttesterEpochStatus.commit;

    // if all transactions are proccessed then commit
    if (this.transactionsProcessed === this.attestations.length) {
      if (this.status === AttesterEpochStatus.commit) {
        this.commit();
      }
    }
  }

  startReveal() {
    this.logger.info(` * AttestEpoch #${this.epochId} (2) reveal`);
    this.status = AttesterEpochStatus.reveal;
  }

  completed() {
    this.logger.info(` * AttestEpoch #${this.epochId} completed`);
    this.status = AttesterEpochStatus.completed;
  }

  processed(tx: Attestation) {
    this.transactionsProcessed++;

    assert(this.transactionsProcessed <= this.attestations.length);

    if (this.transactionsProcessed === this.attestations.length) {
      if (this.status === AttesterEpochStatus.commit) {
        // all transactions were processed and we are in commit epoch
        this.logger.info(`     * AttestEpoch #${this.epochId} all transactions processed ${this.attestations.length} commiting...`);
        this.commit();
      } else {
        // all transactions were processed but we are NOT in commit epoch yet
        this.logger.info(`     * AttestEpoch #${this.epochId} all transactions processed ${this.attestations.length} waiting for commit epoch`);
      }
    } else {
      // not all transactions were processed
      //this.logger.info(`     * AttestEpoch #${this.epochId} transaction processed ${this.transactionsProcessed}/${this.attestations.length}`);
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

    this.attestStatus = AttestStatus.comitted;
    this.logger.info(` * AttestEpoch #${this.epochId} commited (${this.attestations.length} attestation(s))`);

    // collect validat attestations
    const validated = new Array<Attestation>();
    for (const tx of this.attestations.values()) {
      if (tx.status === AttestationStatus.valid) {
        validated.push(tx);
      }
    }

    // check if there is any valid attestation
    if (validated.length === 0) {
      this.logger.error(`  ! no valid attestations`);
      return;
    }

    // sort valid attestations (blockNumber, transactionIndex, signature)
    validated.sort((a: Attestation, b: Attestation) => a.data.comparator(b.data));

    // collect sorted valid attestation ids
    const validatedHashes: string[] = new Array<string>();
    for (const valid of validated) {
      validatedHashes.push(valid.data.id);
    }

    // create merkle tree
    this.merkleTree = new MerkleTree(validatedHashes);

    this.hash = this.merkleTree.root!;
    this.random = await getRandom();

    //
    //   collect   | commit       | reveal
    //   x         | x+1          | x+2
    //

    // calculate remaining time in epoch
    const now = getTimeSec();
    const epochCommitEndTime = Attester.epochSettings.getEpochIdCommitTimeEnd(this.epochId + 1);
    const commitTimeLeft = epochCommitEndTime - now;

    this.logger.debug(`   # Commit time left ${commitTimeLeft}s`);

    this.attesterWeb3.submitAttestation(
      "submit",
      // commit index (collect+1)
      toBN(this.epochId + 1),
      toBN(this.hash).xor(toBN(this.random)),
      toBN(Hash.create(this.random.toString())),
      toBN(0)
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

    this.logger.info(` * AttestEpoch #${this.epochId} reveal`);

    this.attesterWeb3.submitAttestation(
      "reveal",
      // commit index (collect+2)
      toBN(this.epochId + 2),
      toBN(0),
      toBN(0),
      this.random
    );

    this.attestStatus = AttestStatus.revealed;
  }
}
