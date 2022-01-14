import { ChainNode } from "./ChainNode";
import { AttestationData } from "./AttestationData";

export enum AttestationStatus {
  queued,
  processing,
  failed,
  valid,
  invalid,
}

export interface EventProcessed {
  (tx: Attestation): void;
}

export class Attestation {
  epochId!: number;

  metaData!: any;

  status: AttestationStatus = AttestationStatus.invalid;

  startTime: number = 0;
  endTime: number = 0;

  chainNode: ChainNode | undefined;

  data!: AttestationData;

  // how many time was attestation retried
  retry: number = 0;

  onProcessed: EventProcessed | undefined = undefined;
}
