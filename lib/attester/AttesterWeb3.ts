import BN from "bn.js";
import Web3 from "web3";
import { StateConnector as StateConnectorNew } from "../../typechain-web3-v1-new/StateConnector";
import { StateConnector } from "../../typechain-web3-v1/StateConnector";
import { AttLogger } from "../utils/logger";
import { getWeb3, getWeb3StateConnectorContract } from "../utils/utils";
import { Web3Functions } from "../utils/Web3Functions";
import { AttestationRoundManager } from "./AttestationRoundManager";
import { AttesterClientConfiguration, AttesterCredentials } from "./AttesterClientConfiguration";

export class AttesterWeb3 {
  config: AttesterClientConfiguration;
  credentials: AttesterCredentials;
  logger: AttLogger;

  web3!: Web3;
  stateConnector!: StateConnector | StateConnectorNew;
  web3Functions!: Web3Functions;

  constructor(logger: AttLogger, configuration: AttesterClientConfiguration, credentials: AttesterCredentials) {
    this.logger = logger;
    this.config = configuration;
    this.credentials = credentials;
    this.web3 = getWeb3(credentials.web.rpcUrl) as Web3;
    this.web3Functions = new Web3Functions(this.logger, this.web3, this.credentials.web.accountPrivateKey);
  }

  async initialize() {
    this.stateConnector = await getWeb3StateConnectorContract(this.web3, this.credentials.web.stateConnectorContractAddress);
  }

  check(bnString: string) {
    if (bnString.length != 64 + 2 || bnString[0] !== "0" || bnString[1] !== "x") {
      this.logger.error(`invalid BN formating ${bnString}`);
    }
  }

  /**
   * Submits the attestation data in commit-reveal scheme. It supports old and new commit-reveal scheme.
   * The new commit reveal scheme is copy proof.
   * @param action - label for recording action in logs
   * @param bufferNumber - buffer number in which we are submitting attestation
   * @param merkleRoot - commit Merkle root - used just for logging
   * @param maskedMerkleRoot - masked Merkle root for commit of roundId (old commit-reveal scheme)
   * @param random - random number - used just for logging
   * @param hashedRandom - hashed random (old commit-reveal scheme)
   * @param revealedRandomPrev - revealed random (new and old commit-reveal scheme)
   * @param merkleRootPrev - revealed merkle root (new commit-reveal scheme)
   * @param commitHash - commit hash (the new commit-reveal scheme)
   * @param verbose - whether loggin is verbose (default true)
   * @returns
   */
  async submitAttestation(
    action: string,
    bufferNumber: BN,
    merkleRoot: string,
    maskedMerkleRoot: string,
    random: string,
    hashedRandom: string,
    revealedRandomPrev: string,
    merkleRootPrev: string,
    commitHash: string,
    verbose = true
  ) {
    let roundId = bufferNumber.toNumber() - 1;
    this.check(maskedMerkleRoot);
    this.check(hashedRandom);
    this.check(revealedRandomPrev);

    let fnToEncode = AttestationRoundManager.credentials.web.useNewStateConnector
      ? (this.stateConnector as StateConnectorNew).methods.submitAttestation(bufferNumber, commitHash, merkleRootPrev, revealedRandomPrev)
      : (this.stateConnector as StateConnector).methods.submitAttestation(bufferNumber, maskedMerkleRoot, hashedRandom, revealedRandomPrev);

    if (verbose) {
      this.logger.info(`action ................. : ${action}`);
      this.logger.info(`bufferNumber_n ......... : ${bufferNumber.toString()}`);
      this.logger.info(`merkleRoot_n ........... : ^e${merkleRoot.toString()}`);
      this.logger.info(`maskedMerkleRoot_n ..... : ${maskedMerkleRoot.toString()}`);
      this.logger.info(`random_n ............... : ^e${random.toString()}`);
      this.logger.info(`hashedRandom_n ......... : ${hashedRandom.toString()}`);
      this.logger.info(`random_n-1 ............. : ${revealedRandomPrev.toString()}`);
    }

    if (process.env.NODE_ENV === "production") {
      //if( true ) {

      const epochEndTime = AttestationRoundManager.epochSettings.getEpochIdTimeEndMs(bufferNumber) / 1000;

      const { receipt, nonce } = await this.web3Functions.signAndFinalize3(action, this.stateConnector.options.address, fnToEncode, epochEndTime);

      if (receipt) {
        await AttestationRoundManager.state.saveRoundCommited(roundId, nonce, receipt.transactionHash);
        await AttestationRoundManager.state.saveRoundRevealed(roundId - 1, nonce, receipt.transactionHash);
      }

      return receipt;
    } else {
      this.logger.warning(`signAndFinalize3 skipped in ^edevelopment mode^^`);

      return "devmode";
    }
  }
}
