import { Verification } from "../verification/attestation-types/attestation-types";
import { AttestationData } from "./AttestationData";
import { AttestationRound } from "./AttestationRound";
import { EventValidateAttestation, SourceHandler } from "./SourceHandler";

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

export interface EventValidate {
  (): void;
}

export class Attestation {
  round: AttestationRound;

  status: AttestationStatus = AttestationStatus.invalid;

  processStartTime: number = 0;
  processEndTime: number = 0;

  data: AttestationData;

  verificationData!: Verification<any, any>;

  // how many time was attestation retried
  retry: number = 0;
  reverification: boolean = false;

  onProcessed: EventProcessed | undefined = undefined;
  onValidateAttestation: EventValidateAttestation

  constructor(round: AttestationRound, data: AttestationData, onValidateAttestation: EventValidateAttestation) {
    this.round = round;
    this.data = data;
    this.onValidateAttestation = onValidateAttestation;
  }

  public get roundId() {
    if (this._testRoundId == null) {
      return this.round?.roundId
    }
    return this._testRoundId;
  }

  public get numberOfConfirmationBlocks() {
    if (this._testNumberOfConfirmationBlocks == null) {
      return this.sourceHandler?.config?.requiredBlocks;
    }
    return this._testNumberOfConfirmationBlocks;
  }

  public get sourceHandler() {
    return this.round?.getSourceHandler(this.data, this.onValidateAttestation);
  }

  ///////////////////////////////////////////////////////
  //// Testing utils - used for testing
  ///////////////////////////////////////////////////////
  
  _testRoundId: number | undefined = undefined;
  _testNumberOfConfirmationBlocks: number | undefined = undefined;

  setTestRoundId(roundId: number | undefined) {
    this._testRoundId = roundId;
  }

  setTestNumberOfConfirmationBlocks(numberOfConfirmationBlocks: number | undefined) {
    this._testNumberOfConfirmationBlocks = numberOfConfirmationBlocks;
  }
}
