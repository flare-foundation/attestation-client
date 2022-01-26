import { ChainNode } from "../chain/ChainNode";
import { AttestationData } from "./AttestationData";
import { AttesterEpoch } from "./AttesterEpoch";

export enum AttestationStatus {
  queued,
  processing,
  failed,
  valid,
  invalid,
  tooLate,
}

export interface EventProcessed {
  (tx: Attestation): void;
}

export class Attestation {
  epochId!: number;
  attesterEpoch!: AttesterEpoch;

  metaData!: any;

  status: AttestationStatus = AttestationStatus.invalid;

  processStartTime: number = 0;
  processEndTime: number = 0;

  chainNode: ChainNode | undefined;

  data!: AttestationData;

  // how many time was attestation retried
  retry: number = 0;
  reverification: boolean = false;

  onProcessed: EventProcessed | undefined = undefined;
}
