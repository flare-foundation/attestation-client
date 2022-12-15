import BN from "bn.js";
import Web3 from "web3";
import { StateConnectorOld } from "../../typechain-web3-v1/StateConnectorOld";
import { getWeb3, getWeb3StateConnectorContract } from "../utils/utils";
import { Web3Functions } from "../utils/Web3Functions";
import { AttestationRoundManager } from "./AttestationRoundManager";
import { AttesterCredentials } from "./AttesterClientConfiguration";

/**
 * Handles submitions to StateConnector
 */
export class AttesterWeb3 {
  attestationRoundManager: AttestationRoundManager;
  credentials: AttesterCredentials

  web3!: Web3;
  stateConnector!: StateConnectorOld;
  web3Functions!: Web3Functions;
  
  constructor(credentials: AttesterCredentials) {
    // for testing only
    if (process.env.NODE_ENV !== "production" && !credentials) {
      return;
    }

    this.credentials = credentials;
    this.web3 = getWeb3(credentials.web.rpcUrl) as Web3;
    this.web3Functions = new Web3Functions(this.logger, this.web3, credentials.web.accountPrivateKey);
  }

  get logger() {
    return this.attestationRoundManager.logger;
  }

  async initialize(attestationRoundManager: AttestationRoundManager) {
    this.attestationRoundManager = attestationRoundManager;
    this.stateConnector = await getWeb3StateConnectorContract(this.web3, this.credentials.web.stateConnectorContractAddress);
  }

  check(bnString: string) {
    if (bnString.length != 64 + 2 || bnString[0] !== "0" || bnString[1] !== "x") {
      this.logger.error(`invalid BN formating ${bnString}`);
    }
  }

  /**
   * Submits the attestation data in commit-reveal scheme.
   * For any given submission in `bufferNumber` we always:
   *  - commit for `roundId = bufferNumber - 1`
   *  - reveal for `roundId = bufferNumber - 2`
   * @param action - label for recording action in logs
   * @param bufferNumber - buffer number in which we are submitting attestation
   * 
   * @param commitedMerkleRoot - committed Merkle root (used just for logging)
   * @param commitedMaskedMerkleRoot - committed masked Merkle root
   * @param commitedRandom - random number of commited round (used just for logging)
   * 
   * @param revealedMerkleRoot - revealed merkle root
   * @param revealedRandom - revealed random
   * 
   * @param verbose - whether loggin is verbose (default true)
   * @returns
   */
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
    this.check(commitedMerkleRoot);
    this.check(commitedMaskedMerkleRoot);
    this.check(revealedRandom);

    const fnToEncode = (this.stateConnector as StateConnectorOld).methods.submitAttestation(bufferNumber, commitedMaskedMerkleRoot, revealedMerkleRoot, revealedRandom);

    if (verbose) {
      this.logger.info(`action .................... : ${action}`);
      this.logger.info(`bufferNumber .............. : ^e${bufferNumber.toString()}`);
      this.logger.info(`commitedMaskedMerkleRoot .. : ^e${commitedMaskedMerkleRoot.toString()}`);
      this.logger.info(`commitedMerkleRoot ........ : ${commitedMerkleRoot.toString()}`);
      this.logger.info(`commitedRandom ............ : ${commitedRandom.toString()}`);
      this.logger.info(`revealedMerkleRoot ........ : ^e${revealedMerkleRoot.toString()}`);
      this.logger.info(`revealedRandom ............ : ^e${revealedRandom.toString()}`);
    }

    //if (process.env.NODE_ENV === "production") {
    if (true) {

      const epochEndTime = this.attestationRoundManager.epochSettings.getEpochIdTimeEndMs(bufferNumber) / 1000 + 5;

      const extReceipt = await this.web3Functions.signAndFinalize3(action, this.stateConnector.options.address, fnToEncode, epochEndTime);

      if (extReceipt.receipt) {
        await this.attestationRoundManager.state.saveRoundCommited(bufferNumber.toNumber() - 1, extReceipt.nonce, extReceipt.receipt.transactionHash);
        await this.attestationRoundManager.state.saveRoundRevealed(bufferNumber.toNumber() - 2, extReceipt.nonce, extReceipt.receipt.transactionHash);
      }

      return extReceipt.receipt;
    } else {
      this.logger.warning(`signAndFinalize3 skipped in ^edevelopment mode^^`);

      return "devmode";
    }
  }
}
