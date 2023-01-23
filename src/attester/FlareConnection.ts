import { toBN } from "@flarenetwork/mcc";
import BN from "bn.js";
import Web3 from "web3";
import { BitVoting } from "../../typechain-web3-v1/BitVoting";
import { StateConnector } from "../../typechain-web3-v1/StateConnector";
import { StateConnectorTempTran } from "../../typechain-web3-v1/StateConnectorTempTran";
import { EpochSettings } from "../utils/EpochSettings";
import { AttLogger } from "../utils/logger";
import { getWeb3, getWeb3Contract, getWeb3StateConnectorContract } from "../utils/utils";
import { Web3Functions } from "../utils/Web3Functions";
import { AttestationRoundManager } from "./AttestationRoundManager";
import { AttestationClientConfig } from "./AttestationClientConfig";
import { retry } from "../utils/PromiseTimeout";

/**
 * Handles submissions to StateConnector and BitVoting contrct
 */
export class FlareConnection {
  attestationRoundManager: AttestationRoundManager;
  config: AttestationClientConfig

  web3!: Web3;
  stateConnector!: StateConnector | StateConnectorTempTran;
  bitVoting!: BitVoting;
  web3Functions!: Web3Functions;
  epochSettings: EpochSettings;
  firstEpochStartTime: number;
  roundDurationSec: number;
  chooseDeadlineSec: number;

  logger: AttLogger;

  constructor(config: AttestationClientConfig, logger: AttLogger) {
    // for testing only
    if (process.env.NODE_ENV !== "production" && !config) {
      return;
    }

    this.config = config;
    this.logger = logger;
    this.web3 = getWeb3(config.web.rpcUrl) as Web3;
    this.web3Functions = new Web3Functions(logger, this.web3, config.web.accountPrivateKey);
  }

  public get rpc(): string {
    return this.config.web.rpcUrl;
  }
  
  public async initialize(attestationRoundManager: AttestationRoundManager) {
    this.attestationRoundManager = attestationRoundManager;
    this.stateConnector = await getWeb3StateConnectorContract(this.web3, this.config.web.stateConnectorContractAddress);
    this.bitVoting = await getWeb3Contract(this.web3, this.config.web.bitVotingContractAddress, "BitVoting") as any as BitVoting;
    this.firstEpochStartTime = parseInt("" + await this.stateConnector.methods.BUFFER_TIMESTAMP_OFFSET().call(), 10);
    this.roundDurationSec = parseInt("" + await this.stateConnector.methods.BUFFER_WINDOW().call(), 10);
    this.epochSettings = new EpochSettings(toBN(this.firstEpochStartTime), toBN(this.roundDurationSec));
    this.chooseDeadlineSec = parseInt("" + await this.bitVoting.methods.BIT_VOTE_DEADLINE().call(), 10);
  }

  protected check(bnString: string) {
    if (bnString.length != 64 + 2 || bnString[0] !== "0" || bnString[1] !== "x") {
      this.logger.error(`invalid BN formatting ${bnString}`);
    }
  }

  public async getAttestorsForAssignors(assignors: string[]): Promise<string[]> {
    let promises = [];
    for(let assignor of assignors) {
      promises.push(this.stateConnector.methods.attestorAddressMapping(assignor).call());
    }
    return await Promise.all(promises);
  }

  public async stateConnectorEvents(fromBlock: number, toBlock: number) {
    return await this.stateConnector.getPastEvents("allEvents", { fromBlock, toBlock});
  }

  public async bitVotingEvents(fromBlock: number, toBlock: number) {
    return await this.bitVoting.getPastEvents("allEvents", { fromBlock, toBlock});
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
   * @param commitedRandom - random number of committed round (used just for logging)
   *
   * @param revealedMerkleRoot - revealed Merkle root
   * @param revealedRandom - revealed random
   *
   * @param verbose - whether logging is verbose (default true)
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

    const fnToEncode = (this.stateConnector as StateConnector | StateConnectorTempTran).methods.submitAttestation(bufferNumber, commitedMaskedMerkleRoot, revealedMerkleRoot, revealedRandom);

    if (verbose) {
      let label = ""
      if(this.config.label != "none") {
        label = `[${this.config.label}]`;
      }
      this.logger.info(`${label}action .................... : ${action}`);
      this.logger.info(`${label}bufferNumber .............. : ^e${bufferNumber.toString()}`);
      this.logger.info(`${label}commitedMaskedMerkleRoot .. : ^e${commitedMaskedMerkleRoot.toString()}`);
      this.logger.info(`${label}commitedMerkleRoot ........ : ${commitedMerkleRoot.toString()}`);
      this.logger.info(`${label}commitedRandom ............ : ${commitedRandom.toString()}`);
      this.logger.info(`${label}revealedMerkleRoot ........ : ^e${revealedMerkleRoot.toString()}`);
      this.logger.info(`${label}revealedRandom ............ : ^e${revealedRandom.toString()}`);
    }

    if (true) {

      const epochEndTime = this.attestationRoundManager.epochSettings.getEpochIdTimeEndMs(bufferNumber) / 1000 + 5;

      const extReceipt = await retry(`${this.logger}submitAttestation signAndFinalize3`, async () => this.web3Functions.signAndFinalize3(action, this.stateConnector.options.address, fnToEncode, epochEndTime));

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
