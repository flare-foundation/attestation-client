import { Managed } from "@flarenetwork/mcc";
import { Verification } from "../verification/attestation-types/attestation-types";
import { AttestationData } from "./AttestationData";
import { AttestationRound } from "./AttestationRound";
import { AttestationStatus } from "./types/AttestationStatus";

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
  // if the attestation is chosen by bit voting result in the 'choose' phase
  chosen: boolean = false;

  // the voting round of the attestation

  private _roundId: number;

  // validation result
  status: AttestationStatus = AttestationStatus.invalid;

  // verification result (response by verifier)
  verificationData!: Verification<any, any>;

  // processing stats
  processStartTime = 0;
  processEndTime = 0;

  // how many time was attestation retried
  retry = 0;
  reverification = false;
  exception: any;

  constructor(roundId: number, data: AttestationData) {
    this._roundId = roundId;
    this.data = data;
  }

  /**
   * Sets index in the round.
   * @param index 
   */
  public setIndex(index: number) {
    this.index = index;
  }

  /**
   *  Round in which the attestation is considered
   */
  public get roundId() {
    if (this._testRoundId === undefined) {
      return this._roundId;
    }
    return this._testRoundId;
  }

  ///////////////////////////////////////////////////////
  // Testing utils - used for testing
  ///////////////////////////////////////////////////////

  _testRoundId: number | undefined = undefined;

  setTestRoundId(roundId: number | undefined) {
    this._testRoundId = roundId;
  }
}
