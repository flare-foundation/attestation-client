import { Managed, toBN } from "@flarenetwork/mcc";
import assert from "assert";
import { DBAttestationRequest } from "../entity/attester/dbAttestationRequest";
import { DBVotingRoundResult } from "../entity/attester/dbVotingRoundResult";
import { criticalAsync } from "../indexer/indexer-utils";
import { getTimeMilli } from "../utils/internetTime";
import { AttLogger, logException } from "../utils/logger";
import { commitHash, MerkleTree, singleHash } from "../utils/MerkleTree";
import { getCryptoSafeRandom, prepareString, xor32 } from "../utils/utils";
import { hexlifyBN, toHex } from "../verification/attestation-types/attestation-types-helpers";
import { Attestation, AttestationStatus } from "./Attestation";
import { AttestationData } from "./AttestationData";
import { AttestationRoundManager } from "./AttestationRoundManager";
import { AttesterWeb3 } from "./AttesterWeb3";
import { EventValidateAttestation, SourceHandler } from "./SourceHandler";
import { SourceId } from "../verification/sources/sources";

//const BN = require("bn");

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
 * Class that provides the data for commit-reveal scheme
 */
@Managed()
export class AttestationRound {
  logger: AttLogger;
  status: AttestationRoundPhase = AttestationRoundPhase.collect;
  attestStatus: AttestationRoundStatus;
  attesterWeb3: AttesterWeb3;
  roundId: number;
  commitEndTime!: number;

  nextRound!: AttestationRound;
  prevRound!: AttestationRound;

  // processing
  attestations = new Array<Attestation>();
  attestationsMap = new Map<string, Attestation>();
  attestationsProcessed: number = 0;

  // save submitted values for reveal
  roundMerkleRoot!: string;
  roundRandom!: string;
  roundMaskedMerkleRoot: string;
  roundHashedRandom: string;
  roundCommitHash: string;

  merkleTree!: MerkleTree;

  sourceHandlers = new Map<SourceId, SourceHandler>(); // Assigns a SourceHandler for each chain

  constructor(epochId: number, logger: AttLogger, attesterWeb3: AttesterWeb3) {
    this.roundId = epochId;
    this.logger = logger;
    this.status = AttestationRoundPhase.collect;
    this.attestStatus = AttestationRoundStatus.collecting;
    this.attesterWeb3 = attesterWeb3;
  }

  getSourceHandler(data: AttestationData, onValidateAttestation: EventValidateAttestation): SourceHandler {
    let sourceHandler = this.sourceHandlers.get(data.sourceId);

    if (sourceHandler) {
      return sourceHandler;
    }

    sourceHandler = new SourceHandler(this, data.sourceId, onValidateAttestation);

    this.sourceHandlers.set(data.sourceId, sourceHandler);

    return sourceHandler;
  }

  addAttestation(attestation: Attestation) {
    // remove duplicates (instruction hash, id, data av proof, ignore timestamp) on the fly
    // todo: check how fast is hash
    const attestationHash = attestation.data.getHash();
    const duplicate = this.attestationsMap.get(attestationHash);

    if (duplicate) {
      this.logger.debug3(
        `attestation ${duplicate.data.blockNumber}.${duplicate.data.logIndex} duplicate found ${attestation.data.blockNumber}.${attestation.data.logIndex}`
      );
      return;
    }

    attestation.onProcessed = (tx) => {
      this.processed(attestation);
    };

    this.attestations.push(attestation);
    this.attestationsMap.set(attestationHash, attestation);

    // start attestation proces
    attestation.sourceHandler.validate(attestation);
  }

  startCommitEpoch() {
    this.logger.group(
      `round #${this.roundId} commit epoch started [1] ${this.attestationsProcessed}/${this.attestations.length} (${
        (this.attestations.length * 1000) / AttestationRoundManager.epochSettings.getEpochLengthMs().toNumber()
      } req/sec)`
    );
    this.status = AttestationRoundPhase.commit;
    this.tryTriggerCommit(); // In case all requests are already processed
  }

  startCommitSubmit() {
    if (AttestationRoundManager.config.submitCommitFinalize) {
      let action = `Finalizing ^Y#${this.roundId - 3}^^`;
      this.attesterWeb3
        .submitAttestation(
          action,
          // commit index (collect+1)
          toBN(this.roundId + 1),
          toHex(0, 32),
          toHex(0, 32),
          toHex(0, 32),
          toHex(0, 32),
          toHex(0, 32),
          toHex(0, 32),
          toHex(0, 32),
          false
        )
        .then((receipt) => {
          if (receipt) {
            this.logger.info(`^G^wfinalized^^ round ^Y#${this.roundId - 3}`);
          }
        });
    }
  }

  startRevealEpoch() {
    this.logger.group(`round #${this.roundId} reveal epoch started [2]`);
    this.status = AttestationRoundPhase.reveal;
  }

  completed() {
    this.logger.group(`round #${this.roundId} completed`);
    this.status = AttestationRoundPhase.completed;
  }

  processed(tx: Attestation) {
    this.attestationsProcessed++;
    assert(this.attestationsProcessed <= this.attestations.length);
    this.tryTriggerCommit();
  }

  async tryTriggerCommit() {
    if (this.attestationsProcessed === this.attestations.length) {
      if (this.status === AttestationRoundPhase.commit) {
        // all transactions were processed and we are in commit epoch
        this.logger.info(`round #${this.roundId} all transactions processed ${this.attestations.length} commiting...`);
        this.commit();
      } else {
        // all transactions were processed but we are NOT in commit epoch yet
        //this.logger.info(`round #${this.epochId} all transactions processed ${this.attestations.length} waiting for commit epoch`);
      }
    } else {
      // not all transactions were processed
      //this.logger.info(`round #${this.epochId} transaction processed ${this.transactionsProcessed}/${this.attestations.length}`);
    }
  }
  async commitLimit() {
    if (this.attestStatus === AttestationRoundStatus.collecting) {
      this.logger.error2(`Round #${this.roundId} processing timeout (${this.attestationsProcessed}/${this.attestations.length} attestation(s))`);

      // cancel all attestations
      this.attestStatus = AttestationRoundStatus.processingTimeout;
    }
  }

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

  prepareDBAttestationRequest(att: Attestation): DBAttestationRequest {
    const db = new DBAttestationRequest();

    db.roundId = att.roundId;
    db.blockNumber = prepareString(att.data.blockNumber.toString(), 128);
    db.logIndex = att.data.logIndex;

    db.verificationStatus = prepareString(att.verificationData?.status.toString(), 128);
    db.attestationStatus = AttestationStatus[att.status];

    db.request = prepareString(JSON.stringify(att.verificationData?.request ? att.verificationData.request : ""), 4 * 1024);
    db.response = prepareString(JSON.stringify(att.verificationData?.response ? att.verificationData.response : ""), 4 * 1024);

    db.exceptionError = prepareString(att.exception?.toString(), 128);

    db.hashData = prepareString(att.verificationData?.hash, 256);

    db.requestBytes = prepareString(att.data.request, 4 * 1024);

    return db;
  }

  async commit() {
    // collect valid attestations and prepare to save all requests
    const dbAttestationRequests = [];
    const validated = new Array<Attestation>();
    for (const tx of this.attestations.values()) {
      if (tx.status === AttestationStatus.valid) {
        validated.push(tx);
      }

      dbAttestationRequests.push(this.prepareDBAttestationRequest(tx));
    }

    // save to DB only if epoch does not exists in the DB yet - save async
    const alreadySavedRound = await AttestationRoundManager.dbServiceAttester.manager.findOne(DBAttestationRequest, { where: { roundId: this.roundId } });

    if (!alreadySavedRound) {
      criticalAsync("commit", async () => {
        await AttestationRoundManager.dbServiceAttester.manager.save(dbAttestationRequests);
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
      return;
    }

    this.logger.info(`round #${this.roundId} comitting (${validated.length}/${this.attestations.length} attestation(s))`);

    const time0 = getTimeMilli();

    // collect sorted valid attestation hashes
    const validatedHashes: string[] = new Array<string>();
    const dbVoteResults = [];
    for (const valid of validated) {
      let voteHash = valid.verificationData.hash!;
      validatedHashes.push(voteHash);

      // save to DB
      const dbVoteResult = new DBVotingRoundResult();
      dbVoteResults.push(dbVoteResult);

      dbVoteResult.roundId = this.roundId;
      dbVoteResult.hash = voteHash;
      dbVoteResult.request = JSON.stringify(valid.verificationData?.request ? hexlifyBN(valid.verificationData.request) : "");
      dbVoteResult.response = JSON.stringify(valid.verificationData?.response ? hexlifyBN(valid.verificationData.response) : "");
    }

    // save to DB
    try {
      AttestationRoundManager.dbServiceAttester.manager.save(dbVoteResults);
    } catch (error) {
      logException(error, `AttestationRound::commit save DB`);
    }

    const time1 = getTimeMilli();

    // create merkle tree
    this.merkleTree = new MerkleTree(validatedHashes);

    this.roundMerkleRoot = this.merkleTree.root!;
    this.roundRandom = await getCryptoSafeRandom();
    this.roundMaskedMerkleRoot = xor32(this.roundMerkleRoot, this.roundRandom);
    this.roundHashedRandom = singleHash(this.roundRandom);
    this.roundCommitHash = commitHash(this.roundMerkleRoot, this.roundRandom, AttestationRoundManager.attesterWeb3.web3Functions.account.address);

    // validate
    const hashTest = xor32(this.roundMaskedMerkleRoot, this.roundRandom);

    if (hashTest !== this.roundMerkleRoot) {
      this.logger.error2(`maskedHash calculated incorrectly !!!`);
    }

    // after commit state has been calculated add it in state
    await AttestationRoundManager.state.saveRound(this, validated.length);

    const time2 = getTimeMilli();

    //
    //   collect   | commit       | reveal
    //   x         | x+1          | x+2
    //

    // calculate remaining time in epoch
    const now = getTimeMilli();
    const epochCommitEndTime = AttestationRoundManager.epochSettings.getRoundIdRevealTimeStartMs(this.roundId);
    const commitTimeLeft = epochCommitEndTime - now;

    this.logger.info(
      `^w^Gcommit^^ round #${this.roundId} attestations: ${validatedHashes.length} time left ${commitTimeLeft}ms (prepare time H:${time1 - time0}ms M:${
        time2 - time1
      }ms)`
    );
  }

  async createEmptyState() {
    this.logger.debug2(`create empty state for #${this.roundId}`);

    this.roundMerkleRoot = "0x0000000000000000000000000000000000000000000000000000000000000000";
    this.roundRandom = await getCryptoSafeRandom();

    this.roundMaskedMerkleRoot = xor32(this.roundMerkleRoot, this.roundRandom);
    this.roundHashedRandom = singleHash(this.roundRandom);
    this.roundCommitHash = commitHash(this.roundMerkleRoot, this.roundRandom, AttestationRoundManager.attesterWeb3.web3Functions.account.address);

    // after commit state has been calculated add it in state
    await AttestationRoundManager.state.saveRound(this);
  }

  async firstCommit() {
    if (!this.canCommit()) {
      await this.createEmptyState();
    }

    let action = `Submitting ^Y#${this.roundId}^^ for bufferNumber ${this.roundId + 1} (first commit)`;

    const nextState = await AttestationRoundManager.state.getRound(this.roundId - 1);

    this.attesterWeb3
      .submitAttestation(
        action,
        // commit index (collect+1)
        toBN(this.roundId + 1),
        this.roundMerkleRoot,
        this.roundMaskedMerkleRoot,
        this.roundRandom,
        this.roundHashedRandom,
        nextState && nextState.random ? nextState.random : toHex(0, 32),
        nextState && nextState.merkleRoot ? nextState.merkleRoot : toHex(0, 32),
        this.roundCommitHash
      )
      .then((receipt) => {
        if (receipt) {
          this.logger.info(`^G^wcomitted^^ round ^Y#${this.roundId}`);
          this.attestStatus = AttestationRoundStatus.comitted;
        } else {
          this.attestStatus = AttestationRoundStatus.error;
        }
      });
  }

  async reveal() {
    if (this.status !== AttestationRoundPhase.reveal) {
      this.logger.error(`round #${this.roundId} cannot reveal (not in reveal epoch status ${this.status})`);
      return;
    }
    if (this.attestStatus !== AttestationRoundStatus.comitted) {
      switch (this.attestStatus) {
        case AttestationRoundStatus.nothingToCommit:
          this.logger.warning(`round #${this.roundId} nothing to reveal`);
          break;
        case AttestationRoundStatus.collecting:
          this.logger.error(
            `  ! AttestEpoch #${this.roundId} cannot reveal (attestations not processed ${this.attestationsProcessed}/${this.attestations.length})`
          );
          break;
        case AttestationRoundStatus.commiting:
          this.logger.error(`round #${this.roundId} cannot reveal (still comitting)`);
          break;
        default:
          this.logger.error(`round #${this.roundId} cannot reveal (not commited ${this.attestStatus})`);
          break;
      }
      return;
    }

    // this.logger.info(`^Cround #${this.roundId} reveal`);

    let nextRoundMerkleRoot = toHex(toBN(0), 32);
    let nextRoundMaskedMerkleRoot = toHex(toBN(0), 32);
    let nextRoundRandom = toHex(toBN(0), 32);
    let nextRoundHashedRandom = toHex(toBN(0), 32);
    let nextRoundCommitHash = toHex(toBN(0), 32);

    let action = `submitting ^Y#${this.roundId + 1}^^ revealing ^Y#${this.roundId}^^ bufferNumber ${this.roundId + 2}`;

    if (this.nextRound) {
      if (!this.nextRound.canCommit()) {
        await this.nextRound.createEmptyState();
      }

      nextRoundMerkleRoot = this.nextRound.roundMerkleRoot;
      nextRoundMaskedMerkleRoot = this.nextRound.roundMaskedMerkleRoot;
      nextRoundRandom = this.nextRound.roundRandom;
      nextRoundHashedRandom = this.nextRound.roundHashedRandom;
      nextRoundCommitHash = this.nextRound.roundCommitHash;

      this.nextRound.attestStatus = AttestationRoundStatus.comitted;
    }

    this.attesterWeb3
      .submitAttestation(
        action,
        // commit index (collect+2)
        toBN(this.roundId + 2),
        nextRoundMerkleRoot,
        nextRoundMaskedMerkleRoot,
        nextRoundRandom,
        nextRoundHashedRandom,
        this.attestStatus === AttestationRoundStatus.comitted ? this.roundRandom : toHex(0, 32),
        this.attestStatus === AttestationRoundStatus.comitted ? this.roundMerkleRoot : toHex(0, 32),
        nextRoundCommitHash
      )
      .then((receit) => {
        if (receit) {
          this.logger.info(`^Cround ^Y#${this.roundId}^C submit completed (buffernumber ${this.roundId + 2})`);
          this.attestStatus = AttestationRoundStatus.revealed;
        } else {
          this.logger.info(`^Rround ^Y#${this.roundId}^R submit error (buffernumber ${this.roundId + 2}) - no receipt`);
          this.attestStatus = AttestationRoundStatus.error;
        }
      });
  }
}
