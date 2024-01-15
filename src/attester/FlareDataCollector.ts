import { AttLogger, logException } from "../utils/logging/logger";
import { sleepMs } from "../utils/helpers/utils";
import { AttesterClient } from "./AttesterClient";
import { FlareConnection } from "./FlareConnection";

/**
 * Collects events and blocks from Flare chain.
 */
export class FlareDataCollector {
  attesterClient: AttesterClient;
  startBlock: number | undefined;

  refreshEventsMs: number;
  label: string = "";

  constructor(attesterClient: AttesterClient, startBlock?: number, refreshEventsMs = 100, label = "") {
    this.attesterClient = attesterClient;
    this.startBlock = startBlock;
    this.refreshEventsMs = refreshEventsMs;
    this.label = label;
  }

  /**
   * Returns the reference to the flare connection object.
   */
  private get flareConnection(): FlareConnection {
    return this.attesterClient.attestationRoundManager.flareConnection;
  }

  /**
   * Returns the reference to the logger, provided by AttesterClient.
   */
  private get logger(): AttLogger {
    return this.attesterClient.logger;
  }

  // https://web3js.readthedocs.io/en/v1.2.11/web3-eth-contract.html?highlight=getPastEvents#contract-events-return
  /**
   * Comparator for event objects
   * @param a
   * @param b
   * @returns
   */
  private eventComparator(a: any, b: any): number {
    if (a.blockNumber < b.blockNumber) return -1;
    if (a.blockNumber > b.blockNumber) return 1;

    if (a.logIndex < b.logIndex) return -1;
    if (a.logIndex > b.logIndex) return 1;

    return 0;
  }

  public async startCollectingBlocksAndEvents() {
    // wait until new block is set
    this.logger.info(`${this.label} waiting for network connection...`);
    const blockHeight = await this.flareConnection.web3Functions.getBlockNumber();
    if (this.startBlock === undefined) {
      this.startBlock = blockHeight;
    }

    let nextBlockNumberToProcess: number = this.startBlock;

    this.logger.info(`${this.label} ^Rnetwork event processing started ^Y${this.startBlock} (height ${blockHeight})`);

    while (true) {
      try {
        let currentBlockNumber = await this.flareConnection.web3Functions.getBlockNumber();
        // wait for new block
        if (nextBlockNumberToProcess >= currentBlockNumber + 1) {
          await sleepMs(this.refreshEventsMs);
          continue;
        }

        // process new blocks
        let promises = [];
        promises.push(this.flareConnection.web3Functions.getBlock(nextBlockNumberToProcess));
        promises.push(this.flareConnection.stateConnectorEvents(nextBlockNumberToProcess, nextBlockNumberToProcess));
        promises.push(this.flareConnection.bitVotingEvents(nextBlockNumberToProcess, nextBlockNumberToProcess));

        const [block, stateConnectorEvents, bitVotingEvents] = await Promise.all(promises);

        const events = [...stateConnectorEvents, ...bitVotingEvents];

        //this.logger.debug(`!new block ${processBlock} with ${events.length} event(s)`);

        // order events by: blockNumber, log_index
        events.sort((a: any, b: any) => {
          return this.eventComparator(a, b);
        });

        for (const event of events) {
          this.attesterClient.onEventCapture(event);
        }

        this.attesterClient.onNextBlockCapture(block);
        nextBlockNumberToProcess++;
      } catch (error) {
        // not for reporting
        logException(error, `${this.label} Web3BlockCollector::processEvents`);
      }
    }
  }
}
