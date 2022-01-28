import assert from "assert";
import BN from "bn.js";
import { Logger } from "winston";
import { toBN } from "../MCC/utils";
import { Hash } from "../utils/Hash";
import { getTimeMilli } from "../utils/internetTime";
import { AttLogger } from "../utils/logger";
import { MerkleTree } from "../utils/MerkleTree";
import { getRandom } from "../utils/utils";
import { Attestation, AttestationStatus } from "./Attestation";
import { Attester } from "./Attester";
import { AttesterWeb3 } from "./AttesterWeb3";

export enum AttesterEpochStatus {
  collect,
  commit,
  reveal,
  completed,
}

export enum AttestStatus {
  collecting,
  commiting,
  comitted,
  revealed,
  nothingToCommit,

  error,
  processingTimeout,
}

export class AttesterEpoch {
  logger: AttLogger;
  status: AttesterEpochStatus = AttesterEpochStatus.collect;
  epochId: number;
  attestations = new Array<Attestation>();
  merkleTree!: MerkleTree;
  hash!: string;
  random!: BN;
  attestStatus: AttestStatus;
  attesterWeb3: AttesterWeb3;

  commitEndTime!: number;

  transactionsProcessed: number = 0;

  constructor(epochId: number, logger: AttLogger, attesterWeb3: AttesterWeb3) {
    this.epochId = epochId;
    this.logger = logger;
    this.status = AttesterEpochStatus.collect;
    this.attestStatus = AttestStatus.collecting;
    this.attesterWeb3 = attesterWeb3;
  }

  addAttestation(attestation: Attestation) {
    attestation!.onProcessed = (tx) => {
      this.processed(attestation);
    };
    this.attestations.push(attestation);
  }

  startCommitEpoch() {
    this.logger.debug(
      ` # AttestEpoch #${this.epochId} commit epoch started [1] ${this.transactionsProcessed}/${this.attestations.length} (${
        (this.attestations.length * 1000) / Attester.epochSettings.getEpochLength().toNumber()
      } req/sec)`
    );
    this.status = AttesterEpochStatus.commit;

    // if all transactions are proccessed then commit
    if (this.transactionsProcessed === this.attestations.length) {
      if (this.status === AttesterEpochStatus.commit) {
        this.commit();
      }
    }
  }

  startRevealEpoch() {
    this.logger.debug(` # AttestEpoch #${this.epochId} reveal epoch started [2]`);
    this.status = AttesterEpochStatus.reveal;
  }

  completed() {
    this.logger.debug(` # AttestEpoch #${this.epochId} completed`);
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

  async commitLimit() {
    if (this.attestStatus === AttestStatus.collecting) {
      this.logger.error2(`  ! AttestEpoch #${this.epochId} processing timeout (${this.transactionsProcessed}/${this.attestations.length} attestation(s))`);

      // cancel all attestations
      this.attestStatus = AttestStatus.processingTimeout;
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

    this.attestStatus = AttestStatus.commiting;

    // collect validat attestations
    const validated = new Array<Attestation>();
    for (const tx of this.attestations.values()) {
      if (tx.status === AttestationStatus.valid) {
        validated.push(tx);
      }
    }

    // check if there is any valid attestation
    if (validated.length === 0) {
      this.logger.error(` ! AttestEpoch #${this.epochId} nothing to commit - no valid attestation (${this.attestations.length} attestation(s))`);
      this.attestStatus = AttestStatus.nothingToCommit;
      return;
    }

    this.logger.info(` * AttestEpoch #${this.epochId} comitting (${validated.length}/${this.attestations.length} attestation(s))`);

    // sort valid attestations (blockNumber, transactionIndex, signature)
    // external sorting is not needed anymore
    //validated.sort((a: Attestation, b: Attestation) => a.data.comparator(b.data));

    const time0 = getTimeMilli();

    // collect sorted valid attestation ids
    const validatedHashes: string[] = new Array<string>();
    for (const valid of validated) {
      validatedHashes.push(valid.data.id);
    }

    // create merkle tree
    this.merkleTree = new MerkleTree(validatedHashes);

    this.hash = this.merkleTree.root!;
    this.random = await getRandom();

    const time1 = getTimeMilli();

    //
    //   collect   | commit       | reveal
    //   x         | x+1          | x+2
    //

    // calculate remaining time in epoch
    const now = getTimeMilli();
    const epochCommitEndTime = Attester.epochSettings.getEpochIdCommitTimeEnd(this.epochId);
    const commitTimeLeft = epochCommitEndTime - now;

    this.logger.info(`^G   # commitAttestation ${this.epochId} time left ${commitTimeLeft}ms (prepare time ${time1 - time0}ms)`);

    this.attesterWeb3
      .submitAttestation(
        `commitAttestation ${this.epochId}`,
        // commit index (collect+1)
        toBN(this.epochId + 1),
        toBN(this.hash).xor(toBN(this.random)),
        toBN(Hash.create(this.random.toString())),
        toBN(0)
      )
      .then((receit) => {
        if (receit) {
          this.logger.info(`^G   * attestation ${this.epochId} commited`);
          this.attestStatus = AttestStatus.comitted;
        } else {
          this.attestStatus = AttestStatus.error;
        }
      });
  }

  async reveal() {
    if (this.status !== AttesterEpochStatus.reveal) {
      this.logger.error(`  ! AttestEpoch #${this.epochId} cannot reveal (not in reveal epoch status ${this.status})`);
      return;
    }
    if (this.attestStatus !== AttestStatus.comitted) {
      switch (this.attestStatus) {
        case AttestStatus.nothingToCommit:
          this.logger.warning(`  ! AttestEpoch #${this.epochId} nothing to reveal`);
          break;
        case AttestStatus.collecting:
          this.logger.error(
            `  ! AttestEpoch #${this.epochId} cannot reveal (attestations not processed ${this.transactionsProcessed}/${this.attestations.length})`
          );
          break;
        case AttestStatus.commiting:
          this.logger.error(`  ! AttestEpoch #${this.epochId} cannot reveal (still comitting)`);
          break;
        default:
          this.logger.error(`  ! AttestEpoch #${this.epochId} cannot reveal (not commited ${this.attestStatus})`);
          break;
      }
      return;
    }

    this.logger.info(`^C * AttestEpoch #${this.epochId} reveal`);

    this.attesterWeb3
      .submitAttestation(
        `revealAttestation ${this.epochId}`,
        // commit index (collect+2)
        toBN(this.epochId + 2),
        toBN(0),
        toBN(0),
        this.random
      )
      .then((receit) => {
        if (receit) {
          this.logger.info(`^C   * attestation ${this.epochId} revealed`);
          this.attestStatus = AttestStatus.revealed;
        } else {
          this.attestStatus = AttestStatus.error;
        }
      });
  }
}
