import assert from "assert";
import BN from "bn.js";
import { toBN } from "flare-mcc";
import { runInThisContext } from "vm";
import { Hash } from "../utils/Hash";
import { getTimeMilli } from "../utils/internetTime";
import { AttLogger } from "../utils/logger";
import { MerkleTree } from "../utils/MerkleTree";
import { getRandom } from "../utils/utils";
import { transactionHash } from "../verification/attestation-request-utils";
import { Attestation, AttestationStatus } from "./Attestation";
import { AttestationRoundManager } from "./AttestationRoundManager";
import { AttesterWeb3 } from "./AttesterWeb3";
import { EventValidateAttestation, SourceHandler } from "./SourceHandler";

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

// todo: priority attestation
// make attestation queue per chain
// make per chain attestation limit
// remove duplicates (instruction hash, id, data av proof, ignore timestamp) on the fly
// collect limited transactions
// cache chain results
// priority event attestations: allow addidional amount of them

// rename Epoch into Round
// - Attester -> AttetstationRoundManager
// - AttesterEpoch -> AttestationRound

// epoch settings manager 'on-the-fly' settings (SourceHandler) `Dynamic Attestation Config`
// - for each combination source (validate transaction, BTC, ...)
// - "requiredBlocks" to 'on-the-fly' settings from static config.json
// - 1000 normal + 50 priority
// - 'on-the-fly' (from epoch)
//
// att/sec
// call/sec
//

export class AttestationRound {
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

  sourceHandlers = new Map<number, SourceHandler>();

  constructor(epochId: number, logger: AttLogger, attesterWeb3: AttesterWeb3) {
    this.epochId = epochId;
    this.logger = logger;
    this.status = AttesterEpochStatus.collect;
    this.attestStatus = AttestStatus.collecting;
    this.attesterWeb3 = attesterWeb3;
  }

  getSourceHandler(source: number, onValidateAttestation: EventValidateAttestation): SourceHandler {
    if (this.sourceHandlers.has(source)) {
      return this.sourceHandlers.get(source)!;
    }

    const sourceHandler = new SourceHandler(this, source, onValidateAttestation);

    this.sourceHandlers.set(source, sourceHandler);

    return sourceHandler;
  }

  addAttestation(attestation: Attestation) {
    attestation.onProcessed = (tx) => {
      this.processed(attestation);
    };

    this.attestations.push(attestation);

    // start attestation proces
    attestation.sourceHandler.validate(attestation);
  }

  startCommitEpoch() {
    this.logger.debug(
      ` # AttestEpoch #${this.epochId} commit epoch started [1] ${this.transactionsProcessed}/${this.attestations.length} (${
        (this.attestations.length * 1000) / AttestationRoundManager.epochSettings.getEpochLength().toNumber()
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
        //this.logger.info(`     * AttestEpoch #${this.epochId} all transactions processed ${this.attestations.length} waiting for commit epoch`);
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

    // collect sorted valid attestation hashes
    const validatedHashes: string[] = new Array<string>();
    for (const valid of validated) {
      let hash = transactionHash(this.attesterWeb3.web3, valid.verificationData!);
      validatedHashes.push(hash!);
    }

    const time1 = getTimeMilli();

    // create merkle tree
    this.merkleTree = new MerkleTree(validatedHashes);

    this.hash = this.merkleTree.root!;
    this.random = await getRandom();

    const time2 = getTimeMilli();

    //
    //   collect   | commit       | reveal
    //   x         | x+1          | x+2
    //

    // calculate remaining time in epoch
    const now = getTimeMilli();
    const epochCommitEndTime = AttestationRoundManager.epochSettings.getEpochIdCommitTimeEnd(this.epochId);
    const commitTimeLeft = epochCommitEndTime - now;

    this.logger.info(
      `^G   # commitAttestation #${this.epochId} ${validatedHashes.length} time left ${commitTimeLeft}ms (prepare time H:${time1 - time0}ms M:${
        time2 - time1
      }ms)`
    );

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
