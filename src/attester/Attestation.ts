import { Managed } from "@flarenetwork/mcc";
import { Verification } from "../verification/attestation-types/attestation-types";
import { AttestationData } from "./AttestationData";
import { AttestationRound } from "./AttestationRound";

export enum AttestationStatus {
  queued,
  processing,
  failed,
  valid,
  invalid,
  tooLate,
  overLimit,
  error,
}

export interface EventProcessed {
  (tx: Attestation): void;
}

/**
 * Attestation class is class holding the state of an attestation throughout whole life-cycle, which includes:
 * - reading attestation request event data into the class, thus initializing
 * - scheduling it to the correct voting round
 * - various statuses and results obtained during verification and submission.
 * 
 * Attestation request events are obtained by {@link AttesterClient}, passed to {@link AttestationRoundManager} and further to 
 * {@link AttestationRound} for a specific voting round, where a list of all attestation round in the sequence of appearance is kept and processed (passed to verifiers, responses checked, etc.)
 */
@Managed()
export class Attestation {
  // Data about event of attestation request
  data: AttestationData;
  // sequential index in attestation round. -1 if not defined.
  index: number = -1;
  // if the attestation is chosen by bit voting in the 'choose' phase
  chosen: boolean = false;

  // the voting round of the attestation
  round: AttestationRound;

  // validation result
  status: AttestationStatus = AttestationStatus.invalid;

  // verification result
  verificationData!: Verification<any, any>;

  // processing stats
  processStartTime = 0;
  processEndTime = 0;

  // how many time was attestation retried
  retry = 0;
  reverification = false;
  exception: any;

  // Cut-off times set by attestation client
  windowStartTime: number = 0;

  constructor(round: AttestationRound, data: AttestationData) {
    this.round = round;
    this.data = data;
  }

  public setIndex(index: number) {
    this.index = index;
  }

  /**
   *  Round in which the attestation is considered
   */
  public get roundId() {
    if (this._testRoundId == null) {
      return this.round?.roundId;
    }
    return this._testRoundId;
  }

  /**
   * Returns source limiter for 
   */
  public get sourceLimiter() {
    return this.round.getSourceLimiter(this.data);
  }

  ///////////////////////////////////////////////////////
  // Testing utils - used for testing
  ///////////////////////////////////////////////////////

  _testRoundId: number | undefined = undefined;

  setTestRoundId(roundId: number | undefined) {
    this._testRoundId = roundId;
  }

}
