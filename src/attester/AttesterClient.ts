import { Managed, sleepMs } from "@flarenetwork/mcc";
import { AttLogger, getGlobalLogger, logException } from "../utils/logger";
import { secToHHMMSS } from "../utils/utils";
import { AttestationClientConfig } from "./AttestationClientConfig";
import { AttestationData } from "./AttestationData";
import { BitVoteData } from "./BitVoteData";
import { AttestationRoundManager } from "./AttestationRoundManager";
import { FlareConnection } from "./FlareConnection";
import { FlareDataCollector } from "./FlareDataCollector";
import { criticalAsync } from "../indexer/indexer-utils";

/**
 * Implementation of the attestation client.
 */
@Managed()
export class AttesterClient {
  config: AttestationClientConfig;
  logger: AttLogger;
  attestationRoundManager: AttestationRoundManager;
  flareConnection: FlareConnection;
  flareDataCollector!: FlareDataCollector;

  constructor(config: AttestationClientConfig, logger?: AttLogger) {
    if (logger) {
      this.logger = logger;
    } else {
      this.logger = getGlobalLogger();
    }

    this.config = config;
    this.flareConnection = new FlareConnection(this.config, this.logger);
    this.attestationRoundManager = new AttestationRoundManager(this.config, this.logger, this.flareConnection);
  }

  get label() {
    return this.attestationRoundManager.label;
  }

  /**
   * Returns a block number of a block, which is surely below time, or returns the first block on the blockchain.
   * Note that function assumes that the block is not far behind as it is used in a specific context
   * @param time 
   * @param step 
   * @returns 
   */
  private async getBlockBeforeTime(time: number, step: number = 10) {
    let blockNumber = await this.flareConnection.web3Functions.getBlockNumber();

    while (true) {
      try {
        const block = await this.flareConnection.web3Functions.getBlock(blockNumber);
        if (block.timestamp < time) {
          this.logger.debug2(`start block number ${blockNumber} time ${secToHHMMSS(block.timestamp)}`);
          return blockNumber;
        }
        blockNumber -= step;
        if (blockNumber < 0) {
          return 0;
        }
      } catch (e) {
        this.logger.error(`Error: ${e}`);
        await sleepMs(10);
      }
    }
  }

  /**
   * Callback for notification from data collector that a new block has been detected on (Flare) chain
   * @param block 
   */
  public async onNextBlockCapture(block: any) {
    this.attestationRoundManager.onLastFlareNetworkTimestamp(block.timestamp);
  }

  /**
   * Processes flare network event - this function is triggering updates.
   * @param event 
   */
  public async onEventCapture(event: any) {
    try {
      // handle Attestation Request
      if (event.event === "AttestationRequest") {
        const attestationData = new AttestationData(event);

        // eslint-disable-next-line
        criticalAsync("onAttestationRequest",
          () => this.attestationRoundManager.onAttestationRequest(attestationData)
        );
      }
    } catch (error) {
      // attestation request is non-parsable. It is ignored      
      logException(error, `${this.label}processEvent(AttestationRequest) - unparsable attestation request`);
    }

    try {
      // handle bit vote event 
      if (event.event === "BitVote") {
        const bitVoteEvent = new BitVoteData(event);
        this.logger.info(`Bit vote data ${bitVoteEvent.data}`);
        this.attestationRoundManager.onBitVoteEvent(bitVoteEvent);
      }
    } catch (error) {
      // bit vote cannot be parsed. It is ignored
      logException(error, `processEvent(BitVote) - unparsable bitvote`);
    }

    try {
      // handle round finalization event
      if (event.event === "RoundFinalised") {
        const roundId = event.returnValues.roundId;
        const merkleRoot = event.returnValues.merkleRoot;
        if (!roundId || Number.isNaN(roundId)) {
          this.logger.error(`invalid RoundFinalized buffer number`);
        } else {
          const dbState = await this.attestationRoundManager.state.getRound(roundId);
          const commitedRoot = dbState ? dbState.merkleRoot : undefined;
          if (commitedRoot) {
            if (commitedRoot === merkleRoot) {
              this.logger.info(`^e^G^Revent^^^G ${this.label}RoundFinalised ${roundId} ${merkleRoot} (root as commited)`);
            } else {
              this.logger.error(`^e^Revent^^ ${this.label}RoundFinalised ${roundId} ${merkleRoot} (commited root ${commitedRoot})`);
            }
          } else {
            this.logger.error(`^e^Revent^^ ${this.label}RoundFinalised ${roundId} ${merkleRoot} (root not commited)`);
          }
        }
      }
    } catch (error) {
      logException(error, `processEvent(RoundFinalised)`);
    }
  }

  /////////////////////////////////////////////////////////////
  // main AC entry function
  /////////////////////////////////////////////////////////////

  /**
   * Main entry function
   */
  async runAttesterClient() {
    // const version = "1.2.0";
    // this.logger.title(`starting Attester Client v${version}`);

    // create state connector, bit voting contracts
    this.logger.info(`flare connection initialization`);
    await this.flareConnection.initialize(this.attestationRoundManager);

    // process configuration
    this.logger.info(`network RPC URL '${this.config.web.rpcUrl}'`);

    this.logger.info(`roundManager initialize`);
    await this.attestationRoundManager.initialize();

    // get block current attestation round
    const startRoundTime = this.attestationRoundManager.epochSettings.getRoundIdTimeStartMs(this.attestationRoundManager.activeRoundId) / 1000;
    this.logger.debug(`start round ^Y#${this.attestationRoundManager.activeRoundId}^^ time ${secToHHMMSS(startRoundTime)}`);
    const startBlock = await this.getBlockBeforeTime(startRoundTime);

    // connect to network block callback
    this.flareDataCollector = new FlareDataCollector(
      this,
      startBlock,
      this.config.web.refreshEventsMs
    );

    await this.flareDataCollector.startCollectingBlocksAndEvents();
  }
}