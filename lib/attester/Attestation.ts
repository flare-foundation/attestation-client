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
  epochId: number;
  round: AttestationRound;
  sourceHandler: SourceHandler;

  status: AttestationStatus = AttestationStatus.invalid;

  processStartTime: number = 0;
  processEndTime: number = 0;

  data: AttestationData;

  verificationData!: Verification<any>;

  // how many time was attestation retried
  retry: number = 0;
  reverification: boolean = false;

  onProcessed: EventProcessed | undefined = undefined;

  constructor(round: AttestationRound, data: AttestationData, onValidateAttestation: EventValidateAttestation) {
    this.round = round;
    this.epochId = round.epochId;
    this.data = data;
    this.sourceHandler = round.getSourceHandler(data, onValidateAttestation);
  }
}
