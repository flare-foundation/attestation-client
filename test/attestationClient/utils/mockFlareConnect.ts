import { AttestationClientConfig } from "../../../src/attester/configs/AttestationClientConfig";
import { FlareConnection } from "../../../src/attester/FlareConnection";
import { AttLogger } from "../../../src/utils/logging/logger";
import BN from "bn.js";

export class MockFlareConnection extends FlareConnection {
  constructor(config: AttestationClientConfig, logger: AttLogger) {
    super(config, logger, false);
  }

  async initialize() {}

  protected checkHex64(bnString: string) {
    if (bnString.length != 64 + 2 || bnString[0] !== "0" || bnString[1] !== "x") {
      this.logger.error(`invalid BN formating ${bnString}`);
    }
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
  }
}
