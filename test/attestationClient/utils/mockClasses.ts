import { prefix0x, unPrefix0x } from "@flarenetwork/mcc";
import { Attestation } from "../../../src/attester/Attestation";
import { FlareConnection } from "../../../src/attester/FlareConnection";
import { AttestationClientConfig } from "../../../src/attester/configs/AttestationClientConfig";
import { SourceRouter } from "../../../src/attester/source/SourceRouter";
import { AttestationResponse, AttestationResponseStatus } from "../../../src/external-libs/AttestationResponse";
import { EpochSettings } from "../../../src/utils/data-structures/EpochSettings";
import { AttLogger } from "../../../src/utils/logging/logger";
import { VerifierRouter } from "../../../src/verification/routing/VerifierRouter";

export class MockFlareConnection extends FlareConnection {
  constructor(config: AttestationClientConfig, logger: AttLogger, initWeb3 = false) {
    super(config, logger, initWeb3);
  }

  epochSettings = new EpochSettings(123n, 90n, 45n);

  pastEventsStateConnector: any[] = [];
  pastEventsBitVote: any[] = [];
  defaultSetAddresses: string[] = [];

  bitVotes: string[] = [];
  roots: string[] = [];

  async initialize() {}

  protected checkHex64(bnString: string) {
    if (bnString.length != 64 + 2 || bnString[0] !== "0" || bnString[1] !== "x") {
      this.logger.error(`invalid BN formating ${bnString}`);
    }
  }

  public async getAttestorsForAssignors(assignors: string[]): Promise<string[]> {
    return this.defaultSetAddresses;
  }

  public async stateConnectorEvents(fromBlock: number, toBlock: number) {
    return this.pastEventsStateConnector;
  }

  public async bitVotingEvents(fromBlock: number, toBlock: number) {
    return this.pastEventsBitVote;
  }

  async submitAttestation(
    action: string,
    bufferNumber: number,
    // commit
    commitedMerkleRoot: string,
    commitedMaskedMerkleRoot: string,
    commitedRandom: string,
    // reveal
    revealedMerkleRoot: string,
    revealedRandom: string,

    verbose = true
  ) {
    const roundId = bufferNumber - 1;
    this.checkHex64(commitedMerkleRoot);
    this.checkHex64(commitedMaskedMerkleRoot);
    this.checkHex64(commitedRandom);
    this.checkHex64(revealedMerkleRoot);
    this.checkHex64(revealedRandom);
    this.roots.push(commitedMaskedMerkleRoot);

    return "valid";
  }

  public async submitBitVote(
    action: string,
    bufferNumber: number,
    bitVote: string,
    numberOfAttestations: number,
    numberOfValidatedAttestations: number,
    duplicateCount: number,
    verbose = true
  ) {
    this.bitVotes.push(prefix0x(unPrefix0x(bitVote).slice(2)));
    return "valid";
  }

  public addStateConnectorEvents(events) {
    this.pastEventsStateConnector.push(...events);
  }

  public addBitVoteEvents(events) {
    this.pastEventsBitVote.push(...events);
  }

  public addDefaultAddress(addresses: string[]) {
    this.defaultSetAddresses.push(...addresses);
  }
}

export class MockSourceRouter extends SourceRouter {}

export class MockVerifierRouter extends VerifierRouter {
  public async verifyAttestation(attestation: Attestation): Promise<AttestationResponse<any>> {
    let res: AttestationResponse<any> = { status: AttestationResponseStatus.VALID };
    return res;
  }
}
