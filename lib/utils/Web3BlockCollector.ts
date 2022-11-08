import Web3 from "web3";
import { Logger } from "winston";
import { logException } from "./logger";
import { getWeb3, getWeb3Contract, getWeb3StateConnectorContract, sleepms } from "./utils";

export class Web3BlockCollector {
  logger: Logger;

  web3: Web3;

  startingBlockNumber: number | undefined;
  currentBlockNumber = 0;

  contractAddress: string;
  contractName: string;
  startBlock: number | undefined;
  action: any;
  refreshEventsMs: number;

  constructor(logger: Logger, url: string, contractAddress: string, contractName: string, startBlock: number | undefined, action: any, refreshEventsMs = 100) {
    this.logger = logger;

    this.web3 = getWeb3(url, this.logger);

    this.contractAddress = contractAddress;
    this.contractName = contractName;
    this.startBlock = startBlock;
    this.action = action;
    this.refreshEventsMs = refreshEventsMs;
  }

  async run() {
    await this.processEvents(this.contractAddress, this.contractName, this.startBlock, this.action);
  }


  // https://web3js.readthedocs.io/en/v1.2.11/web3-eth-contract.html?highlight=getPastEvents#contract-events-return
  eventComparator(a: any, b: any): number {
    if (a.blockNumber < b.blockNumber) return -1;
    if (a.blockNumber > b.blockNumber) return 1;

    if (a.logIndex > a.logIndex) return -1;
    if (a.logIndex < b.logIndex) return 1;

    return 0;
  }

  async processEvents(contractAddress: string, contractName: string, startBlock: number | undefined, action: any) {
    // wait until new block is set
    this.logger.info(`waiting for network connection...`);
    const blockHeight = await this.web3.eth.getBlockNumber();
    this.startingBlockNumber = startBlock ? startBlock : blockHeight;

    const stateConnectorContract =
      contractName === "StateConnector"
        ? await getWeb3StateConnectorContract(this.web3, contractAddress)
        : await getWeb3Contract(this.web3, contractAddress, contractName);
    let processBlock: number = this.startingBlockNumber;

    this.logger.info(`^Rnetwork event processing started ^Y${this.startingBlockNumber} (height ${blockHeight})`);

    while (true) {
      try {
        this.currentBlockNumber = await this.web3.eth.getBlockNumber();
        // wait for new block
        if (processBlock >= this.currentBlockNumber + 1) {
          await sleepms(this.refreshEventsMs);
          continue;
        }

        // process new block
        const events = await stateConnectorContract.getPastEvents("allEvents", { fromBlock: processBlock, toBlock: processBlock });

        //this.logger.debug(`!new block ${processBlock} with ${events.length} event(s)`);

        // order events by: blockNumber, log_index
        events.sort((a: any, b: any) => {
          return this.eventComparator(a, b);
        });

        for (const event of events) {
          action(event);
        }

        processBlock++;
      } catch (error) {
        logException(error, `Web3BlockCollector::procesEvents`);
      }
    }
  }
}
