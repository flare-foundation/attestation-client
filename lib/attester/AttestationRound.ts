import assert from "assert";
import BN from "bn.js";
import { toBN } from "flare-mcc";
import { Hash } from "../utils/Hash";
import { getTimeMilli } from "../utils/internetTime";
import { AttLogger } from "../utils/logger";
import { MerkleTree, singleHash } from "../utils/MerkleTree";
import { getCryptoSafeRandom, getRandom, toHex } from "../utils/utils";
import { Attestation, AttestationStatus } from "./Attestation";
import { AttestationData } from "./AttestationData";
import { AttestationRoundManager } from "./AttestationRoundManager";
import { AttesterWeb3 } from "./AttesterWeb3";
import { EventValidateAttestation, SourceHandler } from "./SourceHandler";

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
  hash!: string;
  random!: BN;
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
    let sourceHandler = this.sourceHandlers.get(data.source);

    if (sourceHandler) {
      return sourceHandler;
    }

    sourceHandler = new SourceHandler(this, data.source, onValidateAttestation);

    this.sourceHandlers.set(data.source, sourceHandler);

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
      `round #${this.roundId} commit epoch started [1] ${this.transactionsProcessed}/${this.attestations.length} (${(this.attestations.length * 1000) / AttestationRoundManager.epochSettings.getEpochLength().toNumber()
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
    console.log("XXX", this.attestations.length)
    return this.transactionsProcessed === this.attestations.length &&
      this.status === AttestationRoundEpoch.commit;
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
    const validated = new Array<Attestation>();
    for (const tx of this.attestations.values()) {
      if (tx.status === AttestationStatus.valid) {
        validated.push(tx);
      }
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
    for (const valid of validated) {
      // todo: fix this. transactionHash does not compile ....
      //let hash = valid.verificationData ? transactionHash(this.attesterWeb3.web3, valid.verificationData!) : valid.data.getHash();

      // this is for SIMULATION only !!!!
      let hash = valid.data.getHash();

      validatedHashes.push(hash!);
    }

    const time1 = getTimeMilli();

    // create merkle tree
    this.merkleTree = new MerkleTree(validatedHashes);

    this.hash = this.merkleTree.root!;
    this.random = await getCryptoSafeRandom();

    const time2 = getTimeMilli();

    //
    //   collect   | commit       | reveal
    //   x         | x+1          | x+2
    //

    // calculate remaining time in epoch
    const now = getTimeMilli();
    const epochCommitEndTime = AttestationRoundManager.epochSettings.getRoundIdRevealTimeStart(this.roundId);
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

  async firstCommit() {
    if(this.canCommit()) {
      let action = `Submitting for bufferNumber ${this.roundId + 1} (first commit)`;

      let shouldBe = AttestationRoundManager.epochSettings.getEpochIdForTime(toBN(getTimeMilli())).toNumber();

      console.log(`Should be ${shouldBe}, is ${this.roundId + 1}`);
      this.attesterWeb3
        .submitAttestation(
          action,
          // commit index (collect+1)
          toBN(this.roundId + 1),
          toHex(toBN(this.hash).xor(this.random), 32),
          singleHash(this.random),
          toHex(toBN(0), 32)
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
      // return;
    }

    // this.logger.info(`^Cround #${this.roundId} reveal`);

    let nextRoundMaskedMerkleRoot = toHex(toBN(0), 32);
    let nextRoundHashedRandom = toHex(toBN(0), 32);

    let action = `Submitting for bufferNumber ${this.roundId + 2}`;

    if (this.nextRound) {
      if (this.nextRound.canCommit()) {
        action += ` (start commit for ${this.nextRound.roundId})`;
        nextRoundMaskedMerkleRoot = toHex(toBN(this.nextRound.hash).xor(this.nextRound.random), 32);
        nextRoundHashedRandom = singleHash(this.nextRound.random),
        this.nextRound.attestStatus = AttestationRoundStatus.comitted;
      }
      else {
        action += ` (failed start commit for ${this.nextRound.roundId} - too late)`;
        this.nextRound.random = toBN(0);
        this.nextRound.attestStatus = AttestationRoundStatus.comitted;
      }
    }

    this.attesterWeb3
      .submitAttestation(
        action,
        // commit index (collect+2)
        toBN(this.roundId + 2),
        nextRoundMaskedMerkleRoot,
        nextRoundHashedRandom,
        this.attestStatus === AttestationRoundStatus.comitted ? toHex(this.random, 32) : toHex(toBN(0), 32)
      )
      .then((receit) => {
        if (receit) {
          this.logger.info(`^Cbuffernumber ${this.roundId} submitted.`);
          this.attestStatus = AttestationRoundStatus.revealed;
        } else {
          this.attestStatus = AttestationRoundStatus.error;
        }
      });
  }
}
