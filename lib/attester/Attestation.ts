//
// [x] split database to indexer and attester
// [x] all settings from .env to config
// [x] rename config.json tp config-attester.json
// [x] config.json chain metadata is redundant - delete and check
// [x] config.json numberOfConfirmations are to be used from DAC
// [x] move config.json queryWindowSec to DAC
// [x] credential config (with database and network credentials)
// [ ] add another table for ALL attesttaion request
//      - round id
//      - block number (log index)  
//      - requestBytes
//      - request (json)
//      - verificationStatus
//      - response
//      - exception error
//      - dataHash
// [x] configs are not specified by specific file but by directory
// [x] .env only config pack folder  CONFIG_PATH
// [ ] create json files dynamic checker (with tsc)
// [ ] reverification buf in verification (too often) local not updated DB 
// [ ] handling system_failure blocks
// [ ] cleanup spammer config definitions

// deployments
// - spammer
// - att client
// - indexer
// - backend


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
      return this.sourceHandler?.config?.numberOfConfirmations;
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
