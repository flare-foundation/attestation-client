import { Managed, toBN } from "@flarenetwork/mcc";
import assert from "assert";
import { stringify } from "safe-stable-stringify";
import { BitmaskAccumulator } from "../choose-subsets-lib/BitmaskAccumulator";
import { chooseCandidate } from "../choose-subsets-lib/subsets-lib";
import { DBAttestationRequest } from "../entity/attester/dbAttestationRequest";
import { DBVotingRoundResult } from "../entity/attester/dbVotingRoundResult";
import { criticalAsync } from "../indexer/indexer-utils";
import { SourceLimiter } from "../source/SourceLimiter";
import { getTimeMilli } from "../utils/internetTime";
import { logException } from "../utils/logger";
import { commitHash, MerkleTree } from "../utils/MerkleTree";
import { retry } from "../utils/PromiseTimeout";
import { getCryptoSafeRandom, prepareString } from "../utils/utils";
import { hexlifyBN, toHex } from "../verification/attestation-types/attestation-types-helpers";
import { Attestation, AttestationStatus } from "./Attestation";
import { AttestationData, BitVoteData } from "./AttestationData";
import { AttestationRoundManager } from "./AttestationRoundManager";
import { GlobalAttestationConfig } from "./DynamicAttestationConfig";

export enum AttestationRoundPhase {
  collect,
  choose,
  commit,
  reveal,
  completed,
}

export enum AttestationRoundStatus {
  collecting,
  choosing,
  chosen,
  committing,
  committed,
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
  phase: AttestationRoundPhase = AttestationRoundPhase.collect;
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

  activeGlobalConfig: GlobalAttestationConfig;
  defaultSetAddresses: string[];
  duplicateCount: number = 0;
  _initialized = false;

  bitVoteMap = new Map<string, string>();
  bitVoteRecord: string;
  isBitVotingsClosed = false;

  constructor(epochId: number, activeGlobalConfig: GlobalAttestationConfig, attestationRoundManager: AttestationRoundManager) {
    this.roundId = epochId;
    this.phase = AttestationRoundPhase.collect;
    this.attestStatus = AttestationRoundStatus.collecting;
    this.attestationRoundManager = attestationRoundManager;
    this.activeGlobalConfig = activeGlobalConfig;
  }

  get logger() {
    return this.attestationRoundManager.logger;
  }

  get flareConnection() {
    return this.attestationRoundManager.flareConnection;
  }

  get label() {
    return this.attestationRoundManager.label;
  }

  /**
   * Returns bitmask accumulator based on validity of attestations.
   */
  get bitVoteAccumulator(): BitmaskAccumulator {
    let bitmask = new BitmaskAccumulator(this.attestations.length);
    for (let attestation of this.attestations) {
      bitmask.addBit(attestation.status === AttestationStatus.valid);
    }
    return bitmask;
  }

  /**
   * Returns a hex bit mask of successfully validated transactions, prefixed 
   * with last byte of the round id (roundCheck).
   * Used to vote on BitVote contract, if the provider is in the default set.
   */
  get bitVoteMaskWithRoundCheck(): string {
    if (!this.bitVoteRecord) {
      throw new Error("Bit vote not yet recorded");
    }
    let roundHex = toHex(this.roundId).slice(-2).replace("x", "0");
    return '0x' + roundHex + this.bitVoteRecord;
  }

  recordBitVote() {
    this.bitVoteRecord = this.bitVoteAccumulator.toHex();
  }

  /**
   * Returns the number of currently validated attestations
   */
  get numberOfValidatedAttestations(): number {
    let count = 0;
    for (let attestation of this.attestations) {
      if (attestation.status === AttestationStatus.valid) {
        count++;
      }
    }
    return count;
  }

  /**
   * Calculates the bit voting result for the round.
   * The result is valid if we are sure that all votes are registered.
   */
  bitVotingResultIndices(verbose = true): number[] {
    let votes = []
    for (let address of this.defaultSetAddresses) {
      votes.push(this.bitVoteMap.get(address) ?? "0x00");
    }
    let candidate = chooseCandidate(votes, this.activeGlobalConfig.consensusSubsetSize);
    let bitmask = BitmaskAccumulator.fromHex(candidate);
    

    if(bitmask.hasActiveBitsBeyond(this.attestations.length)) {
      this.logger.error(`Local and all indices do not match. Critical error!`);
      return [];
    }
    return bitmask.toIndices(this.attestations.length);
  }

  /**
   * Given a voting consensus bitmask in hex it returns the sequence of indices of attestations in the round
   * that a consensus deems to be valid. Those attestations can/should be rechecked.
   * The function assumes that @param bitVoteConsensusHex is obtained by joint voting and the
   * attestation round has observed all the attestation. Hence the length of the @param bitVoteConsensusHex
   * cannot be longer then the bitmask of the validated attestations (otherwise the critical exception is thrown
   * and the code is shut down). 
   * The function also must be called while the round status is one of 'commit', 'reveal' or 'completed'
   * @param bitVoteConsensusHex 
   * @returns 
   */
  findMissingIndices(bitVoteConsensusHex: string): number[] {
    try {
      if ([AttestationRoundPhase.commit, AttestationRoundPhase.reveal, AttestationRoundPhase.completed].indexOf(this.phase) < 0) {
        throw new Error("findMissingIndices must be called only during phases 'commit' or later")
      }
      return this.bitVoteAccumulator.missingIndices(bitVoteConsensusHex);
    } catch (e) {
      this.logger.error(`findMissingIndices:critical error: ${e}`);
      process.exit(1);
    }
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
        `${this.label}attestation ${duplicate.data.blockNumber}.${duplicate.data.logIndex} duplicate found ${attestation.data.blockNumber}.${attestation.data.logIndex}`
      );
      this.duplicateCount++;
      // duplicates are discarded
      return;
    }

    this.attestations.push(attestation);
    attestation.setIndex(this.attestations.length - 1);
    this.attestationsMap.set(requestId, attestation);

    // check if attestation is invalid
    if (attestation.status === AttestationStatus.failed) {
      this.processed(attestation);
      return;
    }

    // start attestation process
    if (attestation.sourceLimiter.canProceedWithValidation(attestation)) {
      this.attestationRoundManager.sourceRouter.validateAttestation(attestation);
    }
    else {
      this.processed(attestation);
    }
  }

  /**
   * Registers bit vote event. If the vote is from one of the default attestors, the vote is 
   * registered.
   * We assume that the timestamp of the event matches the round id and events round Id check is 
   * also matching.
   * @param bitVoteData Bit vote event data 
   */
  registerBitVote(bitVoteData: BitVoteData) {
    let address = bitVoteData.sender.toLocaleLowerCase();
    if (this.defaultSetAddresses.indexOf(address) >= 0) {
      this.bitVoteMap.set(address, bitVoteData.bitVote);
    }
  }

  async initialize() {
    if (this._initialized) {
      return;
    }
    this.defaultSetAddresses = await retry(
      `${this.label}AttestationRound ${this.roundId} init default set`,
      async () => this.flareConnection.getAttestorsForAssignors(this.activeGlobalConfig.defaultSetAssignerAddresses)
    );

    this.defaultSetAddresses = this.defaultSetAddresses.map(address => address.toLowerCase());

    // this.logger.debug(`${this.label}Round ${this.roundId} initialized with attestation providers`);
    // for(let [index, address] of this.defaultSetAddresses.entries()) {
    //   this.logger.debug(`[${index}] ${address}`);
    // }
    this._initialized = true;
  }
  /**
   * Announces the start of the choose phase
   */
  async startChoosePhase() {
    this.logger.group(
      `${this.label}round #${this.roundId} choose phase started [1] ${this.attestationsProcessed}/${this.attestations.length} (${(this.attestations.length * 1000) / this.attestationRoundManager.epochSettings.getEpochLengthMs().toNumber()
      } req/sec)`
    );
    this.phase = AttestationRoundPhase.choose;
  }


  /**
   * Announces the start of the commit phase and tries to commit
   */
  async startCommitPhase() {
    this.logger.group(
      `${this.label}round #${this.roundId} commit epoch started [1] ${this.attestationsProcessed}/${this.attestations.length} (${(this.attestations.length * 1000) / this.attestationRoundManager.epochSettings.getEpochLengthMs().toNumber()
      } req/sec)`
    );
    this.phase = AttestationRoundPhase.commit;

    //
    await this.tryTriggerCommit(); // In case all requests are already processed
  }

  /**
   * Empty commit.
   * Used in the first round after joining the attestation scheme to commit empty data for commit and reveal of two previous rounds???
   */
  startCommitSubmit() {
    if (this.attestationRoundManager.config.submitCommitFinalize) {
      const action = `Finalizing ^Y#${this.roundId - 3}^^`;

      // eslint-disable-next-line
      criticalAsync("", async () => {
        const receipt = await this.flareConnection.submitAttestation(
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
          this.logger.info(`${this.label}^G^wfinalized^^ round ^Y#${this.roundId - 3}`);
        }
      });
    }
  }

  /**
   * Announces the start of the reveal phase and sets the Round status to reveal
   */
  startRevealPhase() {
    this.logger.group(`${this.label}round #${this.roundId} reveal epoch started [2]`);
    this.phase = AttestationRoundPhase.reveal;
  }

  /**
   * Announces the the end of the round and sets the round status to completed
   */
  completed() {
    this.logger.group(`${this.label}round #${this.roundId} completed`);
    this.phase = AttestationRoundPhase.completed;
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
      if (this.phase === AttestationRoundPhase.commit) {
        // all transactions were processed and we are in commit epoch
        this.logger.info(`${this.label}round #${this.roundId} all transactions processed ${this.attestations.length} commiting...`);
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
      this.logger.error2(`${this.label}Round #${this.roundId} processing timeout (${this.attestationsProcessed}/${this.attestations.length} attestation(s))`);

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
      `${this.label}canCommit(^Y#${this.roundId}^^) processed: ${this.attestationsProcessed}, all: ${this.attestations.length}, epoch status: ${this.phase}, attest status ${this.attestStatus}`
    );
    return (
      this.attestationsProcessed === this.attestations.length &&
      this.attestStatus === AttestationRoundStatus.committing &&
      this.phase === AttestationRoundPhase.commit
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
    if (this.phase !== AttestationRoundPhase.commit) {
      this.logger.error(`${this.label}round #${this.roundId} cannot commit (wrong epoch status ${this.phase})`);
      return;
    }
    if (this.attestStatus !== AttestationRoundStatus.collecting) {
      this.logger.error(`${this.label}round #${this.roundId} cannot commit (wrong attest status ${this.attestStatus})`);
      return;
    }

    this.attestStatus = AttestationRoundStatus.committing;

    // check if there is any valid attestation
    if (validated.length === 0) {
      this.logger.error(`${this.label}round #${this.roundId} nothing to commit - no valid attestation (${this.attestations.length} attestation(s))`);
      this.attestStatus = AttestationRoundStatus.nothingToCommit;
      await this.createEmptyState();
      return;
    }

    this.logger.info(`${this.label}round #${this.roundId} committing (${validated.length}/${this.attestations.length} attestation(s))`);

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
      logException(error, `${this.label}AttestationRound::commit save DB`);
    }

    const time1 = getTimeMilli();

    // create merkle tree
    this.merkleTree = new MerkleTree(validatedHashes);

    this.roundMerkleRoot = this.merkleTree.root!;
    this.roundRandom = await getCryptoSafeRandom();
    this.roundMaskedMerkleRoot = commitHash(this.roundMerkleRoot, this.roundRandom, this.flareConnection.web3Functions.account.address);

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
      `${this.label}^w^Gcommit^^ round #${this.roundId} attestations: ${validatedHashes.length} time left ${commitTimeLeft}ms (prepare time H:${time1 - time0}ms M:${time2 - time1
      }ms)`
    );
  }

  async createEmptyState() {
    this.logger.debug2(`${this.label}create empty state for #${this.roundId}`);

    this.roundMerkleRoot = "0x0000000000000000000000000000000000000000000000000000000000000000";
    this.roundRandom = await getCryptoSafeRandom();

    this.roundMaskedMerkleRoot = commitHash(this.roundMerkleRoot, this.roundRandom, this.flareConnection.web3Functions.account.address);

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

    const action = `${this.label}Submitting ^Y#${this.roundId}^^ for bufferNumber ${this.roundId + 1} (first commit)`;

    const prevRound = await this.attestationRoundManager.state.getRound(this.roundId - 1);

    // eslint-disable-next-line
    criticalAsync("firstCommit", async () => {
      const receipt = await this.flareConnection.submitAttestation(
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
        this.logger.info(`${this.label}^G^wcomitted^^ round ^Y#${this.roundId}`);
        this.attestStatus = AttestationRoundStatus.committed;
      } else {
        this.attestStatus = AttestationRoundStatus.error;
      }
    });
  }

  /**
   * Sends reveal data for this round and commit data for next round
   */
  async reveal() {
    if (this.phase !== AttestationRoundPhase.reveal) {
      this.logger.error(`${this.label}round #${this.roundId} cannot reveal (not in reveal epoch status ${this.phase})`);
      return;
    }
    if (this.attestStatus === AttestationRoundStatus.nothingToCommit) {
      this.logger.warning(`${this.label}round #${this.roundId} nothing to commit`);
    } else if (this.attestStatus !== AttestationRoundStatus.committed) {
      switch (this.attestStatus) {
        case AttestationRoundStatus.collecting:
          this.logger.error(`${this.label}round #${this.roundId} cannot reveal (attestations not processed ${this.attestationsProcessed}/${this.attestations.length})`);
          break;
        case AttestationRoundStatus.committing:
          this.logger.error(`${this.label}round #${this.roundId} cannot reveal (still comitting)`);
          break;
        default:
          this.logger.error(`${this.label}round #${this.roundId} cannot reveal (not commited ${this.attestStatus})`);
          break;
      }

      // we should still commit next round
      //return;
    }


    // this.logger.info(`^Cround #${this.roundId} reveal`);

    let nextRoundMerkleRoot = toHex(toBN(0), 32);
    let nextRoundMaskedMerkleRoot = toHex(toBN(0), 32);
    let nextRoundRandom = toHex(toBN(0), 32);

    const action = `${this.label}submitting ^Y#${this.roundId + 1}^^ revealing ^Y#${this.roundId}^^ bufferNumber ${this.roundId + 2}`;

    if (this.nextRound) {
      if (!this.nextRound.canCommit()) {
        await this.nextRound.createEmptyState();
      }

      nextRoundMerkleRoot = this.nextRound.roundMerkleRoot;
      nextRoundMaskedMerkleRoot = this.nextRound.roundMaskedMerkleRoot;
      nextRoundRandom = this.nextRound.roundRandom;

      this.nextRound.attestStatus = AttestationRoundStatus.committed;
    }

    // eslint-disable-next-line
    criticalAsync("", async () => {
      const receipt = await this.flareConnection.submitAttestation(
        action,
        // commit index (collect+2)
        toBN(this.roundId + 2),
        // commit
        nextRoundMerkleRoot,
        nextRoundMaskedMerkleRoot,
        nextRoundRandom,
        // reveal
        this.attestStatus === AttestationRoundStatus.committed ? this.roundMerkleRoot : toHex(0, 32),
        this.attestStatus === AttestationRoundStatus.committed ? this.roundRandom : toHex(0, 32),
      );

      if (receipt) {
        this.logger.info(`${this.label}^Cround ^Y#${this.roundId}^C submit completed (buffernumber ${this.roundId + 2})`);
        this.attestStatus = AttestationRoundStatus.revealed;
      } else {
        this.logger.info(`${this.label}^Rround ^Y#${this.roundId}^R submit error (buffernumber ${this.roundId + 2}) - no receipt`);
        this.attestStatus = AttestationRoundStatus.error;
      }
    });
  }

  /**
   * Submits the bitmask for validated transaction.
   */
  async bitVote() {
    return;  // DEBUG first
    // To early. Retry later.
    if (this.phase === AttestationRoundPhase.collect) {
      setTimeout(() => this.bitVote(), 1000);
      return;
    }

    if (this.phase === AttestationRoundPhase.choose) {
      const action = `${this.label}submitting ^Y#${this.roundId + 1}^^ revealing ^Y#${this.roundId}^^ bufferNumber ${this.roundId + 2}`;
      // eslint-disable-next-line
      const vote = this.bitVoteMaskWithRoundCheck;
      criticalAsync("", async () => {
        const receipt = await this.flareConnection.submitBitVote(
          action,
          toBN(this.roundId + 1),
          this.bitVoteMaskWithRoundCheck,
          this.attestations.length,
          this.numberOfValidatedAttestations,
          this.duplicateCount
        );
        if (receipt) {
          this.logger.info(`${this.label}^Cround ^Y#${this.roundId}^C bit vote submitted (buffernumber ${this.roundId + 1})`);
          this.attestStatus = AttestationRoundStatus.chosen;
        } else {
          this.logger.error(`${this.label}^Rround ^Y#${this.roundId}^R bit vote submit error (buffernumber ${this.roundId + 1}) - no receipt`);
          this.attestStatus = AttestationRoundStatus.error;
        }
      });
      return;
    }

    // Bit call called too late, wrong time
    this.logger.error(`${this.label}^Rround ^Y#${this.roundId}^R: bit vote at wrong time in phase ${this.phase}`)
  }
}