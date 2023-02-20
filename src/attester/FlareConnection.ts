import { toBN } from "@flarenetwork/mcc";
import BN from "bn.js";
import Web3 from "web3";
import { BitVoting } from "../../typechain-web3-v1/BitVoting";
import { StateConnector } from "../../typechain-web3-v1/StateConnector";
import { StateConnectorTempTran } from "../../typechain-web3-v1/StateConnectorTempTran";
import { BitmaskAccumulator } from "../choose-subsets-lib/BitmaskAccumulator";
import { isValidHexString } from "../choose-subsets-lib/subsets-lib";
import { EpochSettings } from "../utils/data-structures/EpochSettings";
import { retry } from "../utils/helpers/promiseTimeout";
import { getWeb3, getWeb3Contract, getWeb3StateConnectorContract } from "../utils/helpers/web3-utils";
import { Web3Functions } from "../utils/helpers/Web3Functions";
import { AttLogger } from "../utils/logging/logger";
import { AttesterState } from "./AttesterState";
import { AttestationClientConfig } from "./configs/AttestationClientConfig";

/**
 * Handles submissions to StateConnector and BitVoting contract
 */
export class FlareConnection {
  attestationClientConfig: AttestationClientConfig;
  attesterState: AttesterState;
  web3!: Web3;
  stateConnector!: StateConnector | StateConnectorTempTran;
  bitVoting!: BitVoting;
  web3Functions!: Web3Functions;
  epochSettings: EpochSettings;

  logger: AttLogger;

  constructor(config: AttestationClientConfig, logger: AttLogger, initWeb3 = true) {
    // for testing only
    if (process.env.NODE_ENV === "development" && !config) {
      return;
    }

    this.attestationClientConfig = config;
    this.logger = logger;
    if (initWeb3) {
      this.web3 = getWeb3(config.web.rpcUrl) as Web3;
      this.web3Functions = new Web3Functions(logger, this.web3, config.web);
    }
  }

  public get rpc(): string {
    return this.attestationClientConfig.web.rpcUrl;
  }

  get label() {
    let label = "";
    if (this.attestationClientConfig.label != "none") {
      label = `[${this.attestationClientConfig.label}]`;
    }
    return label;
  }

  public async initialize() {
    this.stateConnector = await getWeb3StateConnectorContract(this.web3, this.attestationClientConfig.web.stateConnectorContractAddress);
    this.bitVoting = (await getWeb3Contract(this.web3, this.attestationClientConfig.web.bitVotingContractAddress, "BitVoting")) as any as BitVoting;
    const firstEpochStartTime = parseInt("" + (await this.stateConnector.methods.BUFFER_TIMESTAMP_OFFSET().call()), 10);
    const roundDurationSec = parseInt("" + (await this.stateConnector.methods.BUFFER_WINDOW().call()), 10);
    const chooseDeadlineSec = parseInt("" + (await this.bitVoting.methods.BIT_VOTE_DEADLINE().call()), 10);
    this.epochSettings = new EpochSettings(toBN(firstEpochStartTime), toBN(roundDurationSec), toBN(chooseDeadlineSec));
  }

  /**
   * Set attestation client state manager
   * @param attesterState 
   */
  public setStateManager(attesterState: AttesterState) {
    this.attesterState = attesterState;
  }

  /**
   * Logs if hex string is not of the correct form.
   * @param hexString 
   */
  protected checkHex64(hexString: string) {
    const isValid = isValidHexString(hexString) && hexString.length === 64 + 2;
    if (!isValid) {
      this.logger.error(`invalid BN formatting ${hexString}`);
    }
  }

  /**
   * Returns attestation provider addresses assigned by assignors. Assignors are governance multisig signers
   * each having a right to assign one member of the default set of attesters.
   * @param assignors 
   * @returns 
   */
  public async getAttestorsForAssignors(assignors: string[]): Promise<string[]> {
    let promises = [];
    for (let assignor of assignors) {
      promises.push(this.stateConnector.methods.attestorAddressMapping(assignor).call());
    }
    return await Promise.all(promises);
  }

  /**
   * Returns all events on the StateConnector contract between the blocks (included).
   * Block range limitations are subject to specific Flare node.
   * @param fromBlock 
   * @param toBlock 
   * @returns 
   */
  public async stateConnectorEvents(fromBlock: number, toBlock: number) {
    return await retry(
      `FlareConnection::stateConnectorEvents`,
      async () => this.stateConnector.getPastEvents("allEvents", { fromBlock, toBlock })
    );
  }

  /**
   * Returns all events on the BitVoting contract between the blocks (included).
   * Block range limitations are subject to specific Flare node.
   * @param fromBlock 
   * @param toBlock 
   * @returns 
   */
  public async bitVotingEvents(fromBlock: number, toBlock: number) {
    return await retry(
      `FlareConnection::bitVotingEvents`,
      async () => this.bitVoting.getPastEvents("allEvents", { fromBlock, toBlock })
    );
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
  public async submitAttestation(
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
    this.checkHex64(commitedMerkleRoot);
    this.checkHex64(commitedMaskedMerkleRoot);
    this.checkHex64(revealedRandom);

    const fnToEncode = (this.stateConnector as StateConnector | StateConnectorTempTran).methods.submitAttestation(
      bufferNumber,
      commitedMaskedMerkleRoot,
      revealedMerkleRoot,
      revealedRandom
    );

    if (verbose) {
      this.logger.info(`${this.label}action .................... : ${action}`);
      this.logger.info(`${this.label}bufferNumber .............. : ^e${bufferNumber.toString()}`);
      this.logger.info(`${this.label}commitedMaskedMerkleRoot .. : ^e${commitedMaskedMerkleRoot.toString()}`);
      this.logger.info(`${this.label}commitedMerkleRoot ........ : ${commitedMerkleRoot.toString()}`);
      this.logger.info(`${this.label}commitedRandom ............ : ${commitedRandom.toString()}`);
      this.logger.info(`${this.label}revealedMerkleRoot ........ : ^e${revealedMerkleRoot.toString()}`);
      this.logger.info(`${this.label}revealedRandom ............ : ^e${revealedRandom.toString()}`);
    }

    const epochEndTime = this.epochSettings.getEpochIdTimeEndMs(bufferNumber) / 1000 + 5;

    const extReceipt = await retry(`${this.logger}submitAttestation signAndFinalize3`,
      async () => this.web3Functions.signAndFinalize3Sequenced(
        action,
        this.stateConnector.options.address,
        fnToEncode,
        epochEndTime
      )
    );

    if (extReceipt.receipt) {
      await this.attesterState.saveRoundCommitted(bufferNumber.toNumber() - 1, extReceipt.nonce, extReceipt.receipt.transactionHash);
      await this.attesterState.saveRoundRevealed(bufferNumber.toNumber() - 2, extReceipt.nonce, extReceipt.receipt.transactionHash);
      return extReceipt.receipt;
    }
    return null;
  }

  /**
   * Submits bit vote based on already 
   * @param action 
   * @param bufferNumber label for recording action in logs
   * @param bitVote hex string representing bit mask of validated attestations
   * @param verbose whether logging is verbose (default true)
   * @returns 
   */
  public async submitBitVote(
    action: string,
    bufferNumber: BN,
    bitVote: string,
    numberOfAttestations: number,
    numberOfValidatedAttestations: number,
    duplicateCount: number,
    verbose = true
  ) {

    const fnToEncode = this.bitVoting.methods.submitVote(bufferNumber, bitVote);

    if (verbose) {
      let hexBitvote = bitVote.slice(4);
      let bitSequence = "";
      if (hexBitvote.length > 0) {
        bitSequence = BitmaskAccumulator.fromHex(hexBitvote).toBitString();
      }

      this.logger.info(`${this.label}action .................... : ${action}`);
      this.logger.info(`${this.label}bufferNumber .............. : ^e${bufferNumber.toString()}`);
      this.logger.info(`${this.label}bitVote ................... : ^e${bitVote} (${bitSequence})`);
      this.logger.info(`${this.label}No. attestations........... : ^e${numberOfValidatedAttestations}/${numberOfAttestations}`);
      this.logger.info(`${this.label}No. duplicates............. : ^e${duplicateCount}`);
    }

    const epochEndTime = this.epochSettings.getEpochIdTimeEndMs(bufferNumber) / 1000 + 5;

    const extReceipt = await retry(`${this.logger}submitAttestation signAndFinalize3`,
      async () => this.web3Functions.signAndFinalize3Sequenced(
        action,
        this.bitVoting.options.address,
        fnToEncode,
        epochEndTime
      )
    );

    if (extReceipt.receipt) {
      await this.attesterState.saveRoundBitVoted(bufferNumber.toNumber() - 1, extReceipt.nonce, extReceipt.receipt.transactionHash, bitVote);
    }

    return extReceipt.receipt;
  }
}
