import Web3 from "web3";
import { Logger } from "winston";
import { sleepms } from "./Sleep";
import { getWeb3, getWeb3Contract } from "./utils";

export class Web3BlockCollector {
  logger: Logger;

  web3: Web3;

  startingBlockNumber: number | undefined;
  currentBlockNumber: number = 0;

  constructor(logger: Logger, url: string, contractAddress: string, contractName: string, startBlock: number | undefined, action: any) {
    this.logger = logger;

    this.web3 = getWeb3(url, this.logger);

    this.procesEvents(contractAddress, contractName, startBlock, action);
  }

  async procesEvents(contractAddress: string, contractName: string, startBlock: number | undefined, action: any) {
    // wait until new block is set
    this.logger.info(" * Waiting for network connection...");
    this.startingBlockNumber = await this.web3.eth.getBlockNumber();

    const stateConnectorContract = await getWeb3Contract(this.web3, contractAddress, contractName);
    let processBlock: number = this.startingBlockNumber;

    this.logger.info(" * Network event processing started");

    while (true) {
      this.currentBlockNumber = await this.web3.eth.getBlockNumber();
      // wait for new block
      if (processBlock >= this.currentBlockNumber + 1) {
        await sleepms(100);
        continue;
      }

      // process new block
      const events = await stateConnectorContract.getPastEvents("allEvents", { fromBlock: processBlock, toBlock: processBlock });

      this.logger.info(`   * New block ${processBlock} with ${events.length} event(s)`);

      for (const event of events) {
        action(event);
      }

      processBlock++;
    }
  }
}
