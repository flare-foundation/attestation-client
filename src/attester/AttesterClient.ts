import { Managed, sleepMs } from "@flarenetwork/mcc";
import { AttLogger, getGlobalLogger, logException } from "../utils/logger";
import { secToHHMMSS } from "../utils/utils";
import { Web3BlockCollector } from "../utils/Web3BlockCollector";
import { AttestationData, AttestationSubmit } from "./AttestationData";
import { AttestationRoundManager } from "./AttestationRoundManager";
import { AttesterConfig } from "./AttesterConfig";
import { AttesterWeb3 } from "./AttesterWeb3";

/**
 * Implementation of the attestation client.
 */
@Managed()
export class AttesterClient {
  config: AttesterConfig;
  logger: AttLogger;
  attestationRoundManager: AttestationRoundManager;
  attesterWeb3: AttesterWeb3;
  blockCollector!: Web3BlockCollector;

  constructor(config: AttesterConfig, logger?: AttLogger) {
    if (logger) {
      this.logger = logger;
    } else {
      this.logger = getGlobalLogger();
    }

    this.config = config;
    this.attesterWeb3 = new AttesterWeb3(this.config, this.logger);
    this.attestationRoundManager = new AttestationRoundManager(this.config, this.logger, this.attesterWeb3);
  }

  /**
   * Returns a block number of a block, which is surely below time.
   * Note that function assumes that the block is not far behind as it is used in a specific context
   * @param time 
   * @returns 
   */
  private async getBlockBeforeTime(time: number) {
    let blockNumber = await this.attesterWeb3.web3Functions.getBlockNumber();

    while (true) {
      try {
        const block = await this.attesterWeb3.web3Functions.getBlock(blockNumber);

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

  /**
   * Process network events - this function is triggering updates.
   * @param event 
   */
  private async processEvent(event: any) {
    try {
      // handle Attestation Request

      if (event.event === "AttestationRequest") {
        const attestation = new AttestationData(event);

        // eslint-disable-next-line
        this.attestationRoundManager.attestate(attestation); // non awaited promise
      }

    } catch (error) {
      logException(error, `processEvent(AttestationRequest)`);
    }

    try {
      // handle Choose data events 

      if (event.event === "AttestationSubmit") {
        const attestationSubmitEvent = new AttestationSubmit(event);

        this.logger.info(`Choose data ${attestationSubmitEvent.data}`);

        // TODO save events in Attestation Round
      }

    } catch (error) {
      logException(error, `processEvent(AttestationSubmit)`);
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
              this.logger.info(`^e^G^Revent^^^G RoundFinalised ${roundId} ${merkleRoot} (root as commited)`);
            } else {
              this.logger.error(`^e^Revent^^ RoundFinalised ${roundId} ${merkleRoot} (commited root ${commitedRoot})`);
            }
          } else {
            this.logger.error(`^e^Revent^^ RoundFinalised ${roundId} ${merkleRoot} (root not commited)`);
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

    // create state connector
    this.logger.info(`attesterWeb3 initialize`);
    await this.attesterWeb3.initialize(this.attestationRoundManager);

    // process configuration
    this.logger.info(`network RPC URL '${this.config.web.rpcUrl}'`);

    this.logger.info(`roundManager initialize`);
    await this.attestationRoundManager.initialize();

    // get block current attestation round
    const startRoundTime = this.attestationRoundManager.epochSettings.getRoundIdTimeStartMs(this.attestationRoundManager.activeRoundId) / 1000;
    this.logger.debug(`start round ^Y#${this.attestationRoundManager.activeRoundId}^^ time ${secToHHMMSS(startRoundTime)}`);
    const startBlock = await this.getBlockBeforeTime(startRoundTime);

    // connect to network block callback
    this.blockCollector = new Web3BlockCollector(
      this.logger,
      this.config.web.rpcUrl,
      this.config.web.stateConnectorContractAddress,
      "StateConnector",  // Independent of the actual contract name. Obtaining the correct contract is handled by `getWeb3StateConnectorContract`
      startBlock,
      (event: any) => {
        // eslint-disable-next-line
        this.processEvent(event); // non awaited promise
      },
      this.config.web.refreshEventsMs
    );

    await this.blockCollector.run();
  }
}