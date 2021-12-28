import assert from "assert";
import { BigNumber } from "ethers";
import { Logger } from "winston";
import { Attestation, AttestationStatus } from "./Attestation";
import { Hash } from "./Hash";
import { toBN } from "./MCC/tx-normalize";
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
  attestations = new Array<Attestation>();
  merkleTree!: MerkleTree;
  hash!: string;
  random!: BN;
  attestStatus: AttestStatus;

  transactionsProcessed: number = 0;

  constructor(epochId: number, logger: Logger) {
    this.epochId = epochId;
    this.logger = logger;
    this.status = AttesterEpochStatus.collect;
    this.attestStatus = AttestStatus.collecting;
    this.logger.info(`  * AttestEpoch #${this.epochId} (0) collect`);
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

    if (this.status === AttesterEpochStatus.commit) {
      this.commit();
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
      this.logger.error(`     * AttestEpoch #${this.epochId} all transactions processed ${this.attestations.length}`);
      if (this.status === AttesterEpochStatus.commit) {
        this.commit();
      }
    } else {
      this.logger.error(`     * AttestEpoch #${this.epochId} transaction processed ${this.transactionsProcessed}/${this.attestations.length}`);
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

    this.logger.info(` * AttestEpoch #${this.epochId} commited`);
    this.attestStatus = AttestStatus.comitted;

    // collect validat attestations
    const validated: Attestation[] = new Array<Attestation>();
    for (const tx of this.attestations.values()) {
      if (tx.status === AttestationStatus.valid) {
        validated.push(tx);
      }
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

    // this.hash = makeBN(this.merkleTree.root());
    this.hash = this.merkleTree.root!;
    this.random = await getRandom();

    this.submitAttestation(
      // commit index (collect+1)
      toBN(this.epochId + 1),
      toBN(this.hash).xor(this.random),
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

    this.logger.info(` * AttestEpoch #${this.epochId} reveal`);

    this.submitAttestation(
      // commit index (collect+1)
      makeBN(this.epochId + 1),
      toBN(0),
      makeBN(0),
      this.random
    );

    this.attestStatus = AttestStatus.revealed;
  }

  submitAttestation(bufferNumber: BN, maskedMerkleHash: BN, committedRandom: BN, revealedRandom: BN) {
    // todo: submit to network
  }
}
