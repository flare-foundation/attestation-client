import assert from "assert";
import BN from "bn.js";
import { toBN } from "flare-mcc";
import { DBAttestationRequest } from "../entity/attester/dbAttestationRequest";
import { DBVotingRoundResult } from "../entity/attester/dbVotingRoundResult";
import { getTimeMilli } from "../utils/internetTime";
import { AttLogger, logException } from "../utils/logger";
import { MerkleTree, singleHash } from "../utils/MerkleTree";
import { getCryptoSafeRandom, prepareString } from "../utils/utils";
import { toHex } from "../verification/attestation-types/attestation-types-helpers";
import { Attestation, AttestationStatus } from "./Attestation";
import { AttestationData } from "./AttestationData";
import { AttestationRoundManager } from "./AttestationRoundManager";
import { AttesterWeb3 } from "./AttesterWeb3";
import { EventValidateAttestation, SourceHandler } from "./SourceHandler";

//const BN = require("bn");

export enum AttestationRoundEpoch {
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

// todo: priority attestation
// [x] make attestation queue per chain
// [x] make per chain attestation limit
// [x] remove duplicates (instruction hash, id, data av proof, ignore timestamp) on the fly
// [x] optimize remove duplicates (sorted set)
// [/] cache chain results (non persistent in memory caching)
// [/] priority event attestations: allow addidional amount of them

// [x] multiple nodes per chain
// [x] node load limiting

// [x] rename Epoch into Round
// [x] Attester -> AttetstationRoundManager
// [x] AttesterEpoch -> AttestationRound
// [x] check for in-code variable names and rename them

// [x] epoch settings manager 'on-the-fly' settings (SourceHandler) `Dynamic Attestation Config`
// [x] - for each combination source (validate transaction, BTC, ...)
// [x] - "requiredBlocks" to 'on-the-fly' settings from static config.json
// [x] - 1000 normal + 50 priority
// [x] - 'on-the-fly' (from epoch)
// [x] watch folder for changes and load then dynamically
// [x] DAC cleanup (remove all that are older than active epoch - but one)
// [x] make json human readable
// [x] convert code to read human redable json
// [x] check if ChainType and SourceId values and names match

// [ ] make nice text base round display (cursor moving)

// [ ] check performance for new nodes
// [ ] test two node of single type 

// terminology
// att/sec
// call/sec
// call/att

export class AttestationRound {
  logger: AttLogger;
  status: AttestationRoundEpoch = AttestationRoundEpoch.collect;
  attestStatus: AttestationRoundStatus;
  attesterWeb3: AttesterWeb3;
  roundId: number;
  commitEndTime!: number;

  nextRound!: AttestationRound;
  prevRound!: AttestationRound;

  // processing
  attestations = new Array<Attestation>();
  attestationsMap = new Map<string, Attestation>();
  transactionsProcessed: number = 0;

  // save submitted values for reveal
  roundHash!: string;
  roundRandom!: string;//BN;
  merkleTree!: MerkleTree;

  sourceHandlers = new Map<number, SourceHandler>();

  constructor(epochId: number, logger: AttLogger, attesterWeb3: AttesterWeb3) {
    this.roundId = epochId;
    this.logger = logger;
    this.status = AttestationRoundEpoch.collect;
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
      this.logger.debug(
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
      `round #${this.roundId} commit epoch started [1] ${this.transactionsProcessed}/${this.attestations.length} (${(this.attestations.length * 1000) / AttestationRoundManager.epochSettings.getEpochLengthMs().toNumber()
      } req/sec)`
    );
    this.status = AttestationRoundEpoch.commit;
    this.tryTriggerCommit();   // In case all requests are already processed
  }

  startRevealEpoch() {
    this.logger.group(`round #${this.roundId} reveal epoch started [2]`);
    this.status = AttestationRoundEpoch.reveal;
  }

  completed() {
    this.logger.group(`round #${this.roundId} completed`);
    this.status = AttestationRoundEpoch.completed;
  }

  processed(tx: Attestation) {
    this.transactionsProcessed++;
    assert(this.transactionsProcessed <= this.attestations.length);
    this.tryTriggerCommit();
  }

  async tryTriggerCommit() {
    if (this.transactionsProcessed === this.attestations.length) {
      if (this.status === AttestationRoundEpoch.commit) {
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
      this.logger.error2(`Round #${this.roundId} processing timeout (${this.transactionsProcessed}/${this.attestations.length} attestation(s))`);

      // cancel all attestations
      this.attestStatus = AttestationRoundStatus.processingTimeout;
    }
  }

  canCommit(): boolean {
    this.logger.info(`#${this.roundId}: canCommit: processed: ${this.transactionsProcessed}, all: ${this.attestations.length}, status: ${this.status}`)
    return this.transactionsProcessed === this.attestations.length &&
      this.status === AttestationRoundEpoch.commit;
  }


  prepareDBAttestationRequest(att: Attestation): DBAttestationRequest {
    const db = new DBAttestationRequest();

    db.roundId = att.roundId;
    db.blockNumber = prepareString(att.data.blockNumber.toString(), 128);
    db.logIndex = att.data.logIndex;

    db.verificationStatus = prepareString(att.verificationData?.status.toString(), 128);

    db.request = prepareString(JSON.stringify(att.verificationData?.request ? att.verificationData.request : ""), 4 * 1024);
    db.response = prepareString(JSON.stringify(att.verificationData?.response ? att.verificationData.response : ""), 4 * 1024);

    db.exceptionError = prepareString(att.exception?.toString(), 128);

    db.hashData = prepareString(att.verificationData?.hash, 256);

    db.requestBytes = prepareString(att.data.request, 4 * 1024);

    return db;
  }

  async commit() {
    console.log("COMMIT")
    if (this.status !== AttestationRoundEpoch.commit) {
      this.logger.error(`round #${this.roundId} cannot commit (wrong epoch status ${this.status})`);
      return;
    }
    if (this.attestStatus !== AttestationRoundStatus.collecting) {
      this.logger.error(`round #${this.roundId} cannot commit (wrong attest status ${this.attestStatus})`);
      return;
    }

    this.attestStatus = AttestationRoundStatus.commiting;

    // collect validat attestations
    const dbAttesttaionRequests = [];
    const validated = new Array<Attestation>();
    for (const tx of this.attestations.values()) {
      if (tx.status === AttestationStatus.valid) {
        validated.push(tx);
      } else {
        console.log("INVALID:", tx.data.request)
      }

      // prepare the attestation r
      const dbAttestationRequest = new DBAttestationRequest();

      dbAttesttaionRequests.push(this.prepareDBAttestationRequest(tx));
    }

    // save to DB
    try {
      AttestationRoundManager.dbServiceAttester.manager.save(dbAttesttaionRequests);
    }
    catch (error) {
      logException(error, `AttestationRound::commit save DB`);
    }

    // check if there is any valid attestation
    if (validated.length === 0) {
      this.logger.error(`round #${this.roundId} nothing to commit - no valid attestation (${this.attestations.length} attestation(s))`);
      this.attestStatus = AttestationRoundStatus.nothingToCommit;
      return;
    }

    this.logger.info(`round #${this.roundId} comitting (${validated.length}/${this.attestations.length} attestation(s))`);

    // sort valid attestations (blockNumber, transactionIndex, signature)
    // external sorting is not needed anymore
    //validated.sort((a: Attestation, b: Attestation) => a.data.comparator(b.data));

    const time0 = getTimeMilli();

    // collect sorted valid attestation hashes
    const validatedHashes: string[] = new Array<string>();
    const dbVoteResults = [];
    for (const valid of validated) {
      // let hash = valid.verificationData ? valid.verificationData.hash : valid.data.getHash();
      let voteHash = valid.verificationData.hash!;
      validatedHashes.push(voteHash);

      // save to DB
      const dbVoteResult = new DBVotingRoundResult();
      dbVoteResults.push(dbVoteResult);

      dbVoteResult.roundId = this.roundId;
      dbVoteResult.hash = voteHash;
      dbVoteResult.request = JSON.stringify(valid.verificationData?.request ? valid.verificationData.request : "");
      dbVoteResult.response = JSON.stringify(valid.verificationData?.response ? valid.verificationData.response : "");
    }

    // save to DB
    try {
      AttestationRoundManager.dbServiceAttester.manager.save(dbVoteResults);
    }
    catch (error) {
      logException(error, `AttestationRound::commit save DB`);
    }

    const time1 = getTimeMilli();

    // create merkle tree
    this.merkleTree = new MerkleTree(validatedHashes);

    this.roundHash = this.merkleTree.root!;
    this.roundRandom = await getCryptoSafeRandom();

    const time2 = getTimeMilli();

    //
    //   collect   | commit       | reveal
    //   x         | x+1          | x+2
    //

    AttestationRoundManager.commitedMerkleRoots.set(this.roundId, this.roundHash);

    // calculate remaining time in epoch
    const now = getTimeMilli();
    const epochCommitEndTime = AttestationRoundManager.epochSettings.getRoundIdRevealTimeStartMs(this.roundId);
    const commitTimeLeft = epochCommitEndTime - now;

    this.logger.info(
      `^GRound #${this.roundId} - commit hashes collected: ${validatedHashes.length}. Time left ${commitTimeLeft}ms (prepare time H:${time1 - time0}ms M:${time2 - time1}ms)`
    );


    // First commit after start only!
    // if (!this.prevRound) {
    //   let delayToCommit = AttestationRoundManager.epochSettings.getRoundIdCommitTimeStart(this.roundId) - now + 
    //   // trigger first commit
    //   setTimeout(() => {
    //     this.firstCommit();
    //   }, epochCommitTime - now + this.config.revealTime * 1000);
    //   this.firstCommit();
    // }
  }

  BNtoString(number: BN) {
    return '0x' + (number.toString(16)).padStart(64,'0');
  }

  async firstCommit() {
    if (this.canCommit()) {
      let action = `Submitting for bufferNumber ${this.roundId + 1} (first commit)`;

      //let shouldBe = AttestationRoundManager.epochSettings.getEpochIdForTime(toBN(getTimeMilli())).toNumber();

      //console.log(`Should be ${shouldBe}, is ${this.roundId + 1}`);

      // let roundHashBN = new BN.BigInteger(this.roundHash, 16);
      // let roundRandomBN = new BN.BigInteger(this.roundRandom, 16);
      // let xorHash = '0x' + roundHashBN.xor(roundRandomBN).toString(16);
      // let randomHash = singleHash(this.roundRandom);

      let roundHashBN = toBN(this.roundHash);
      let roundRandomBN = toBN(this.roundRandom);
      let xorHash = this.BNtoString(roundHashBN.xor(roundRandomBN));
      let randomHash = singleHash(this.roundRandom);

      this.attesterWeb3
        .submitAttestation(
          action,
          // commit index (collect+1)
          toBN(this.roundId + 1),
          xorHash,
          randomHash,
          toHex(0, 32) // we just put something here
          // toHex(toBN(this.roundHash).xor(this.roundRandom), 32),
          // singleHash(this.roundRandom),
          // toHex(toBN(0), 32)
        )
        .then((receipt) => {
          if (receipt) {
            this.logger.info(`^GRound ${this.roundId} commited`);
            //console.log( receipt );
            this.attestStatus = AttestationRoundStatus.comitted;
          } else {
            this.attestStatus = AttestationRoundStatus.error;
          }
        });
    } else {
      this.logger.error(`First round #${this.roundId} cannot be commited (too late)`);
    }
  }

  async reveal() {
    if (this.status !== AttestationRoundEpoch.reveal) {
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
            `  ! AttestEpoch #${this.roundId} cannot reveal (attestations not processed ${this.transactionsProcessed}/${this.attestations.length})`
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

    let nextRoundMaskedMerkleRoot = toHex(toBN(0), 32);
    let nextRoundHashedRandom = toHex(toBN(0), 32);

    let action = `Submitting for bufferNumber ${this.roundId + 2}`;

    if (this.nextRound) {
      if (this.nextRound.canCommit()) {
        action += ` (start commit for ${this.nextRound.roundId})`;

        // let roundHashBN = new BN.BigInteger(this.nextRound.roundHash, 16);
        // let roundRandomBN = new BN.BigInteger(this.nextRound.roundRandom, 16);
        // nextRoundMaskedMerkleRoot = '0x' + roundHashBN.xor(roundRandomBN).toString(16);
        // nextRoundHashedRandom = singleHash(this.nextRound.roundRandom);
        let roundHashBN = toBN(this.nextRound.roundHash);
        let roundRandomBN = toBN(this.nextRound.roundRandom);
        nextRoundMaskedMerkleRoot = this.BNtoString( roundHashBN.xor(roundRandomBN));
        nextRoundHashedRandom = singleHash(this.nextRound.roundRandom);

        // nextRoundMaskedMerkleRoot = toHex(toBN(this.nextRound.roundHash).xor(this.nextRound.roundRandom), 32);
        // nextRoundHashedRandom = singleHash(this.nextRound.roundRandom);
        this.nextRound.attestStatus = AttestationRoundStatus.comitted;

        this.logger.debug(`commit data prepared: roundId=${this.nextRound.roundId} merkleTree.root=${this.nextRound.merkleTree.root} random=${this.nextRound.roundRandom}`);
      }
      else {
        action += ` (failed start commit for ${this.nextRound.roundId} - too late)`;
        this.nextRound.roundRandom = toHex(0, 32);
        // this.nextRound.roundRandom = toBN(0);
        this.nextRound.attestStatus = AttestationRoundStatus.comitted;
      }
    }

    // roundId = x (bufferNumber)
    // commited on x+1
    // revealed on x+2
    // event on reveal x+3

    this.attesterWeb3
      .submitAttestation(
        action,
        // commit index (collect+2)
        toBN(this.roundId + 2),
        nextRoundMaskedMerkleRoot,
        nextRoundHashedRandom,
        this.attestStatus === AttestationRoundStatus.comitted ? this.roundRandom : toHex(0, 32)
      )
      .then((receit) => {
        if (receit) {
          this.logger.info(`^Cround ${this.roundId} submitt completed (buffernumber ${this.roundId + 2})`);
          this.attestStatus = AttestationRoundStatus.revealed;
        } else {
          this.logger.info(`^Rround ${this.roundId} submitt error (buffernumber ${this.roundId + 2}) - no receipt`);
          this.attestStatus = AttestationRoundStatus.error;
        }
      });
  }
}
