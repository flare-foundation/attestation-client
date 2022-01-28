import { ChainNode } from "../chain/ChainNode";
import { NormalizedTransactionData } from "../verification/attestation-types";
import { AttestationData } from "./AttestationData";
import { AttestationRound } from "./AttestationRound";
import { SourceHandler } from "./SourceHandler";

export enum AttestationStatus {
  queued,
  processing,
  failed,
  valid,
  invalid,
  tooLate,
  overLimit,
}

export interface EventProcessed {
  (tx: Attestation): void;
}

export interface EventValidate {
  (): void;
}

export class Attestation {
  epochId!: number;
  attesterEpoch!: AttestationRound;
  sourceHandler!: SourceHandler;

  metaData!: any;

  status: AttestationStatus = AttestationStatus.invalid;

  processStartTime: number = 0;
  processEndTime: number = 0;

  chainNode: ChainNode | undefined;

  data!: AttestationData;

  verificationData!: NormalizedTransactionData;

  // how many time was attestation retried
  retry: number = 0;
  reverification: boolean = false;

  onProcessed: EventProcessed | undefined = undefined;
}
