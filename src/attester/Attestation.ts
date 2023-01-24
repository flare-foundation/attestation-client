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
 * Attestation class for Attestation providers to attest validity or a request.
 * Validity of the attestation is given by verificationData that is provided using {@link SourceManager}
 */
@Managed()
export class Attestation {
  round: AttestationRound;

  status: AttestationStatus = AttestationStatus.invalid;

  processStartTime = 0;
  processEndTime = 0;

  // Data about event of attestation request
  data: AttestationData;

  verificationData!: Verification<any, any>;

  // how many time was attestation retried
  retry = 0;
  reverification = false;
  exception: any;

  // Cut-off times set by attestation client
  // Set when passed to the relevant SourceManager
  windowStartTime: number = 0;

  // sequential index in attestation round. -1 if not defined.
  index: number = -1;
  // if the attestation is chosen by bitvote
  chosen: boolean = false;

  constructor(round: AttestationRound, data: AttestationData) {
    this.round = round;
    this.data = data;
  }

  public setIndex(index: number) {
    this.index = index;
  }
  /**
   *  Round in which attestation in considered
   */
  public get roundId() {
    if (this._testRoundId == null) {
      return this.round?.roundId;
    }
    return this._testRoundId;
  }

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
