import { Managed, sleepMs } from "@flarenetwork/mcc";
import { AttLogger, getGlobalLogger, logException } from "../utils/logger";
import { secToHHMMSS } from "../utils/utils";
import { AttestationClientConfig } from "./AttestationClientConfig";
import { AttestationData, BitVoteData } from "./AttestationData";
import { AttestationRoundManager } from "./AttestationRoundManager";
import { FlareConnection } from "./FlareConnection";
import { FlareDataCollector } from "./FlareDataCollector";

/**
 * Implementation of the attestation client.
 */
@Managed()
export class AttesterClient {
  config: AttestationClientConfig;
  logger: AttLogger;
  attestationRoundManager: AttestationRoundManager;
  flareConnection: FlareConnection;
  blockCollector!: FlareDataCollector;

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
   * Returns a block number of a block, which is surely below time.
   * Note that function assumes that the block is not far behind as it is used in a specific context
   * @param time 
   * @returns 
   */
  private async getBlockBeforeTime(time: number) {
    let blockNumber = await this.flareConnection.web3Functions.getBlockNumber();

    while (true) {
      try {
        const block = await this.flareConnection.web3Functions.getBlock(blockNumber);

        if (block.timestamp < time) {
          this.logger.debug2(`start block number ${blockNumber} time ${secToHHMMSS(block.timestamp)}`);
          return blockNumber;
        }

        blockNumber -= 10;
        if (blockNumber < 0) {
          return 0;
        }
      } catch (e) {
        this.logger.error(`Error: ${e}`);
        await sleepMs(10);
      }
    }
  }


  public async onNextBlockCapture(block: any) {
      this.attestationRoundManager.onLastFlareNetworkTimestamp(block.timestamp);
  }

  /**
   * Processes network event - this function is triggering updates.
   * @param event 
   */
  public async onEventCapture(event: any) {
    try {
      // handle Attestation Request
      if (event.event === "AttestationRequest") {
        const attestationData = new AttestationData(event);

        // eslint-disable-next-line
        this.attestationRoundManager.attestate(attestationData); // non awaited promise
      }

    } catch (error) {
      logException(error, `${this.label}processEvent(AttestationRequest)`);
    }

    try {
      // handle submit attestation event 
      if (event.event === "BitVote") {
        const bitVoteEvent = new BitVoteData(event);

        this.logger.info(`Bit vote data ${bitVoteEvent.data}`);

        this.attestationRoundManager.onBitVoteEvent(bitVoteEvent);
        // TODO save events in Attestation Round
      }
    } catch (error) {
      logException(error, `processEvent(BitVote)`);
    }

    try {
      // handle Round Finalization
      if (event.event === "RoundFinalised") {
        const roundId = event.returnValues.roundId;
        const merkleRoot = event.returnValues.merkleRoot;

        if (!roundId || Number.isNaN(roundId)) {
          this.logger.error(`invalid RoundFinalized buffer number`);
        }
        else {
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
    const version = "1.2.0";

    this.logger.title(`starting Attester Client v${version}`);

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
    this.blockCollector = new FlareDataCollector(
      this,
      startBlock,
      this.config.web.refreshEventsMs
    );

    await this.blockCollector.startCollectingBlocksAndEvents();
  }
}