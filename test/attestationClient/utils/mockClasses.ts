import { AttestationClientConfig } from "../../../src/attester/configs/AttestationClientConfig";
import { FlareConnection } from "../../../src/attester/FlareConnection";
import { AttLogger } from "../../../src/utils/logging/logger";
import BN from "bn.js";
import { EpochSettings } from "../../../src/utils/data-structures/EpochSettings";
import { toBN } from "web3-utils";
import { SourceRouter } from "../../../src/attester/source/SourceRouter";
import { VerifierRouter } from "../../../src/verification/routing/VerifierRouter";
import { Attestation } from "../../../src/attester/Attestation";
import { Verification, VerificationStatus } from "../../../src/verification/attestation-types/attestation-types";
import { prefix0x, unPrefix0x } from "@flarenetwork/mcc";

export class MockFlareConnection extends FlareConnection {
  constructor(config: AttestationClientConfig, logger: AttLogger, initWeb3 = false) {
    super(config, logger, initWeb3);
  }

  epochSettings = new EpochSettings(toBN(123), toBN(90), toBN(45));

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
    bufferNumber: BN,
    // commit
    commitedMerkleRoot: string,
    commitedMaskedMerkleRoot: string,
    commitedRandom: string,
    // reveal
    revealedMerkleRoot: string,
    revealedRandom: string,

    verbose = true
  ) {
    const roundId = bufferNumber.toNumber() - 1;
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
    bufferNumber: BN,
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
  public async verifyAttestation(attestation: Attestation): Promise<Verification<any, any>> {
    let res: Verification<any, any> = { status: VerificationStatus.OK };
    return res;
  }
}
