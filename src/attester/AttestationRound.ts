import { Managed, toBN } from "@flarenetwork/mcc";
import assert from "assert";
import { stringify } from "safe-stable-stringify";
import { DBAttestationRequest } from "../entity/attester/dbAttestationRequest";
import { DBVotingRoundResult } from "../entity/attester/dbVotingRoundResult";
import { criticalAsync } from "../indexer/indexer-utils";
import { SourceLimiter } from "../source/SourceLimiter";
import { getTimeMilli } from "../utils/internetTime";
import { logException } from "../utils/logger";
import { commitHash, MerkleTree } from "../utils/MerkleTree";
import { getCryptoSafeRandom, prepareString } from "../utils/utils";
import { hexlifyBN, toHex } from "../verification/attestation-types/attestation-types-helpers";
import { Attestation, AttestationStatus } from "./Attestation";
import { AttestationData } from "./AttestationData";
import { AttestationRoundManager } from "./AttestationRoundManager";

export enum AttestationRoundPhase {
  collect,
  commit,
  reveal,
  completed,
}

export enum AttestationRoundStatus {
  collecting,
  commiting,
  comitted,
  revealed,
  nothingToCommit,

  error,
  processingTimeout,
}

// terminology
// att/sec
// call/sec
// call/att

/**
 * Manages a specific attestation round, specifically the data in the commit-reveal scheme.
 */
@Managed()
export class AttestationRound {
  attestationRoundManager: AttestationRoundManager;
  status: AttestationRoundPhase = AttestationRoundPhase.collect;
  attestStatus: AttestationRoundStatus;
  roundId: number;
  commitEndTime!: number;

  nextRound!: AttestationRound;
  prevRound!: AttestationRound;

  // processing
  attestations = new Array<Attestation>();
  attestationsMap = new Map<string, Attestation>();
  attestationsProcessed = 0;

  // save submitted values for reveal
  roundMerkleRoot!: string;
  roundRandom!: string;
  roundMaskedMerkleRoot: string;

  merkleTree!: MerkleTree;

  sourceLimiters = new Map<number, SourceLimiter>();

  constructor(epochId: number, attestationRoundManager: AttestationRoundManager) {
    this.roundId = epochId;
    this.status = AttestationRoundPhase.collect;
    this.attestStatus = AttestationRoundStatus.collecting;
    this.attestationRoundManager = attestationRoundManager;
  }

  get logger() {
    return this.attestationRoundManager.logger;
  }

  get attesterWeb3() {
    return this.attestationRoundManager.attesterWeb3;
  }

  get sourceRouter() {
    return this.attestationRoundManager.sourceRouter;
  }

  /**
   * Returns the existing source Handler for the source chain of an attestation or creates a new sourceLimiter
   * @param data 
   * @param onValidateAttestation 
   * @returns 
   */
  getSourceLimiter(data: AttestationData): SourceLimiter {
    let sourceLimiter = this.sourceLimiters.get(data.sourceId);

    if (sourceLimiter) {
      return sourceLimiter;
    }

    sourceLimiter = new SourceLimiter(this, data.sourceId);

    this.sourceLimiters.set(data.sourceId, sourceLimiter);

    return sourceLimiter;
  }

  /**
   * Adds the @param attestation to the list of attestations for this round and starts the validation process
   */
  addAttestation(attestation: Attestation) {
    // remove duplicates (instruction hash, id, data av proof, ignore timestamp) on the fly
    // todo: check how fast is hash
    const requestId = attestation.data.getId();
    const duplicate = this.attestationsMap.get(requestId);

    if (duplicate) {
      this.logger.debug3(
        `attestation ${duplicate.data.blockNumber}.${duplicate.data.logIndex} duplicate found ${attestation.data.blockNumber}.${attestation.data.logIndex}`
      );
      return;
    }

    this.attestations.push(attestation);
    this.attestationsMap.set(requestId, attestation);

    // check if attestation is invalid
    if (attestation.status === AttestationStatus.failed) {
      this.processed(attestation);
      return;
    }

    // start attestation process
    if (attestation.sourceLimiter.canProceedWithValidation(attestation)) {
      this.sourceRouter.validateAttestation(attestation);
    }
    else {
      this.processed(attestation);
    }
  }

  /**
   * Announces the start of the commit phase and tries to commit
   */
  async startCommitEpoch() {
    this.logger.group(
      `round #${this.roundId} commit epoch started [1] ${this.attestationsProcessed}/${this.attestations.length} (${(this.attestations.length * 1000) / this.attestationRoundManager.epochSettings.getEpochLengthMs().toNumber()
      } req/sec)`
    );
    this.status = AttestationRoundPhase.commit;

    //
    await this.tryTriggerCommit(); // In case all requests are already processed
  }

  /**
   * Empty commit.
   * Used in the first round after joining the attestation scheme to commit empty data for commit and reveal of two previous rounds???
   */
  startCommitSubmit() {
    if (this.attestationRoundManager.credentials.submitCommitFinalize) {
      const action = `Finalizing ^Y#${this.roundId - 3}^^`;

      // eslint-disable-next-line
      criticalAsync("", async () => {
        const receipt = await this.attesterWeb3.submitAttestation(
          action,
          // commit index (collect+1)
          toBN(this.roundId + 1),
          toHex(0, 32),
          toHex(0, 32),
          toHex(0, 32),
          toHex(0, 32),
          toHex(0, 32),
          false
        );
        if (receipt) {
          this.logger.info(`^G^wfinalized^^ round ^Y#${this.roundId - 3}`);
        }
      });
    }
  }

  /**
   * Announces the start of the reveal phase and sets the Round status to reveal
   */
  startRevealEpoch() {
    this.logger.group(`round #${this.roundId} reveal epoch started [2]`);
    this.status = AttestationRoundPhase.reveal;
  }

  /**
   * Announces the the end of the round and sets the round status to completed
   */
  completed() {
    this.logger.group(`round #${this.roundId} completed`);
    this.status = AttestationRoundPhase.completed;
  }

  processed(tx: Attestation): void {
    this.attestationsProcessed++;
    assert(this.attestationsProcessed <= this.attestations.length);

    // eslint-disable-next-line
    criticalAsync("processed", async () => {
      await this.tryTriggerCommit();
    });
  }

  /**
   * Commits if all attestations are processed and commit epoch has started
   */
  async tryTriggerCommit(): Promise<void> {
    if (this.attestationsProcessed === this.attestations.length) {
      if (this.status === AttestationRoundPhase.commit) {
        // all transactions were processed and we are in commit epoch
        this.logger.info(`round #${this.roundId} all transactions processed ${this.attestations.length} commiting...`);
        await this.commit();
      } else {
        // all transactions were processed but we are NOT in commit epoch yet
        //this.logger.info(`round #${this.epochId} all transactions processed ${this.attestations.length} waiting for commit epoch`);
      }
    } else {
      // not all transactions were processed
      //this.logger.info(`round #${this.epochId} transaction processed ${this.transactionsProcessed}/${this.attestations.length}`);
    }
  }

  async commitLimit(): Promise<void> {
    if (this.attestStatus === AttestationRoundStatus.collecting) {
      this.logger.error2(`Round #${this.roundId} processing timeout (${this.attestationsProcessed}/${this.attestations.length} attestation(s))`);

      // cancel all attestations
      this.attestStatus = AttestationRoundStatus.processingTimeout;
    }
  }

  /**
   * Checks if all attestations are processed and if round is in the commit phase
   * @returns
   */
  canCommit(): boolean {
    this.logger.debug(
      `canCommit(^Y#${this.roundId}^^) processed: ${this.attestationsProcessed}, all: ${this.attestations.length}, epoch status: ${this.status}, attest status ${this.attestStatus}`
    );
    return (
      this.attestationsProcessed === this.attestations.length &&
      this.attestStatus === AttestationRoundStatus.commiting &&
      this.status === AttestationRoundPhase.commit
    );
  }

  /**
   * Formats an attestation to be stored in database
   * @param att
   * @returns
   */
  prepareDBAttestationRequest(att: Attestation): DBAttestationRequest {
    const db = new DBAttestationRequest();

    db.roundId = att.roundId;
    db.blockNumber = prepareString(att.data.blockNumber.toString(), 128);
    db.logIndex = att.data.logIndex;

    db.verificationStatus = prepareString(att.verificationData?.status.toString(), 128);
    db.attestationStatus = AttestationStatus[att.status];

    db.request = prepareString(stringify(att.verificationData?.request ? att.verificationData.request : ""), 4 * 1024);
    db.response = prepareString(stringify(att.verificationData?.response ? att.verificationData.response : ""), 4 * 1024);

    db.exceptionError = prepareString(att.exception?.toString(), 128);

    db.hashData = prepareString(att.verificationData?.hash, 256);

    db.requestBytes = prepareString(att.data.request, 4 * 1024);

    return db;
  }

  /**
   *Starts the commit-reveal scheme and saves the attestation data to database.
   */
  async commit() {
    // collect valid attestations and prepare to save all requests
    const dbAttestationRequests = [];
    const validated = new Array<Attestation>();
    for (const attestation of this.attestations.values()) {
      if (attestation.status === AttestationStatus.valid) {
        validated.push(attestation);
      }

      dbAttestationRequests.push(this.prepareDBAttestationRequest(attestation));
    }

    // save to DB only if epoch does not exists in the DB yet - save async
    const alreadySavedRound = await this.attestationRoundManager.dbServiceAttester.manager.findOne(DBAttestationRequest, { where: { roundId: this.roundId } });

    if (!alreadySavedRound) {
      // eslint-disable-next-line
      criticalAsync("commit", async () => {
        await this.attestationRoundManager.dbServiceAttester.manager.save(dbAttestationRequests);
      });
    }

    // check if commit can be performed
    if (this.status !== AttestationRoundPhase.commit) {
      this.logger.error(`round #${this.roundId} cannot commit (wrong epoch status ${this.status})`);
      return;
    }
    if (this.attestStatus !== AttestationRoundStatus.collecting) {
      this.logger.error(`round #${this.roundId} cannot commit (wrong attest status ${this.attestStatus})`);
      return;
    }

    this.attestStatus = AttestationRoundStatus.commiting;

    // check if there is any valid attestation
    if (validated.length === 0) {
      this.logger.error(`round #${this.roundId} nothing to commit - no valid attestation (${this.attestations.length} attestation(s))`);
      this.attestStatus = AttestationRoundStatus.nothingToCommit;
      await this.createEmptyState();
      return;
    }

    this.logger.info(`round #${this.roundId} comitting (${validated.length}/${this.attestations.length} attestation(s))`);

    const time0 = getTimeMilli();

    // collect sorted valid attestation hashes
    const validatedHashes: string[] = new Array<string>();
    const dbVoteResults = [];
    for (const valid of validated) {
      const voteHash = valid.verificationData.hash!;
      validatedHashes.push(voteHash);

      // save to DB
      const dbVoteResult = new DBVotingRoundResult();
      dbVoteResults.push(dbVoteResult);

      dbVoteResult.roundId = this.roundId;
      dbVoteResult.hash = voteHash;
      dbVoteResult.request = stringify(valid.verificationData?.request ? hexlifyBN(valid.verificationData.request) : "");
      dbVoteResult.response = stringify(valid.verificationData?.response ? hexlifyBN(valid.verificationData.response) : "");
    }

    // save to DB
    try {
      await this.attestationRoundManager.dbServiceAttester.manager.save(dbVoteResults);
    } catch (error) {
      logException(error, `AttestationRound::commit save DB`);
    }

    const time1 = getTimeMilli();

    // create merkle tree
    this.merkleTree = new MerkleTree(validatedHashes);

    this.roundMerkleRoot = this.merkleTree.root!;
    this.roundRandom = await getCryptoSafeRandom();
    this.roundMaskedMerkleRoot = commitHash(this.roundMerkleRoot, this.roundRandom, this.attesterWeb3.web3Functions.account.address);

    // after commit state has been calculated add it in state
    await this.attestationRoundManager.state.saveRound(this, validated.length);

    const time2 = getTimeMilli();

    //
    //   collect   | commit       | reveal
    //   x         | x+1          | x+2
    //

    // calculate remaining time in epoch
    const now = getTimeMilli();
    const epochCommitEndTime = this.attestationRoundManager.epochSettings.getRoundIdRevealTimeStartMs(this.roundId);
    const commitTimeLeft = epochCommitEndTime - now;

    this.logger.info(
      `^w^Gcommit^^ round #${this.roundId} attestations: ${validatedHashes.length} time left ${commitTimeLeft}ms (prepare time H:${time1 - time0}ms M:${time2 - time1
      }ms)`
    );
  }

  async createEmptyState() {
    this.logger.debug2(`create empty state for #${this.roundId}`);

    this.roundMerkleRoot = "0x0000000000000000000000000000000000000000000000000000000000000000";
    this.roundRandom = await getCryptoSafeRandom();

    this.roundMaskedMerkleRoot = commitHash(this.roundMerkleRoot, this.roundRandom, this.attesterWeb3.web3Functions.account.address);

    // after commit state has been calculated add it in state
    await this.attestationRoundManager.state.saveRound(this);
  }

  /**
   * First nonempty commit after the attestation client starts running. Tries to get reveal data from database otherwise
   * it does not send reveal data for the previous round?
   */
  async firstCommit() {
    if (!this.canCommit()) {
      await this.createEmptyState();
    }

    const action = `Submitting ^Y#${this.roundId}^^ for bufferNumber ${this.roundId + 1} (first commit)`;

    const prevRound = await this.attestationRoundManager.state.getRound(this.roundId - 1);

    // eslint-disable-next-line
    criticalAsync("firstCommit", async () => {
      const receipt = await this.attesterWeb3.submitAttestation(
        action,
        // commit index (collect+1)
        toBN(this.roundId + 1),
        // commit
        this.roundMerkleRoot,
        this.roundMaskedMerkleRoot,
        this.roundRandom,
        // reveal
        prevRound && prevRound.merkleRoot ? prevRound.merkleRoot : toHex(0, 32),
        prevRound && prevRound.random ? prevRound.random : toHex(0, 32),
      );

      if (receipt) {
        this.logger.info(`^G^wcomitted^^ round ^Y#${this.roundId}`);
        this.attestStatus = AttestationRoundStatus.comitted;
      } else {
        this.attestStatus = AttestationRoundStatus.error;
      }
    });
  }

  /**
   * Sends reveal data for this round and commit data for next round
   */
  async reveal() {
    if (this.status !== AttestationRoundPhase.reveal) {
      this.logger.error(`round #${this.roundId} cannot reveal (not in reveal epoch status ${this.status})`);
      return;
    }
    if (this.attestStatus === AttestationRoundStatus.nothingToCommit) {
      this.logger.warning(`round #${this.roundId} nothing to commit`);
    } else if (this.attestStatus !== AttestationRoundStatus.comitted) {
      switch (this.attestStatus) {
        case AttestationRoundStatus.collecting:
          this.logger.error(`round #${this.roundId} cannot reveal (attestations not processed ${this.attestationsProcessed}/${this.attestations.length})`);
          break;
        case AttestationRoundStatus.commiting:
          this.logger.error(`round #${this.roundId} cannot reveal (still comitting)`);
          break;
        default:
          this.logger.error(`round #${this.roundId} cannot reveal (not commited ${this.attestStatus})`);
          break;
      }

      // we should still commit next round
      //return;
    }


    // this.logger.info(`^Cround #${this.roundId} reveal`);

    let nextRoundMerkleRoot = toHex(toBN(0), 32);
    let nextRoundMaskedMerkleRoot = toHex(toBN(0), 32);
    let nextRoundRandom = toHex(toBN(0), 32);

    const action = `submitting ^Y#${this.roundId + 1}^^ revealing ^Y#${this.roundId}^^ bufferNumber ${this.roundId + 2}`;

    if (this.nextRound) {
      if (!this.nextRound.canCommit()) {
        await this.nextRound.createEmptyState();
      }

      nextRoundMerkleRoot = this.nextRound.roundMerkleRoot;
      nextRoundMaskedMerkleRoot = this.nextRound.roundMaskedMerkleRoot;
      nextRoundRandom = this.nextRound.roundRandom;

      this.nextRound.attestStatus = AttestationRoundStatus.comitted;
    }

    // eslint-disable-next-line
    criticalAsync("", async () => {
      const receipt = await this.attesterWeb3.submitAttestation(
        action,
        // commit index (collect+2)
        toBN(this.roundId + 2),
        // commit
        nextRoundMerkleRoot,
        nextRoundMaskedMerkleRoot,
        nextRoundRandom,
        // reveal
        this.attestStatus === AttestationRoundStatus.comitted ? this.roundMerkleRoot : toHex(0, 32),
        this.attestStatus === AttestationRoundStatus.comitted ? this.roundRandom : toHex(0, 32),
      );

      if (receipt) {
        this.logger.info(`^Cround ^Y#${this.roundId}^C submit completed (buffernumber ${this.roundId + 2})`);
        this.attestStatus = AttestationRoundStatus.revealed;
      } else {
        this.logger.info(`^Rround ^Y#${this.roundId}^R submit error (buffernumber ${this.roundId + 2}) - no receipt`);
        this.attestStatus = AttestationRoundStatus.error;
      }
    });
  }
}
