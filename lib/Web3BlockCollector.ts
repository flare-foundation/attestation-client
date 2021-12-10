import Web3 from "web3";
import { Logger } from "winston";
import { sleepms } from "./Sleep";
import { getWeb3, getWeb3Contract } from "./utils";
import { Web3BlockSubscription } from "./Web3BlockSubscription";

export class Web3BlockCollector {
  logger: Logger;

  web3: Web3;

  blockSubscription: Web3BlockSubscription;

  constructor(
    blockSubscription: Web3BlockSubscription,
    url: string,
    contractAddress: string,
    contractName: string,
    startBlock: number | undefined,
    action: any
  ) {
    this.logger = blockSubscription.logger;
    this.blockSubscription = blockSubscription;

    this.web3 = getWeb3(url, this.logger);

    this.procesEvents(contractAddress, contractName, startBlock, action);
  }

  async procesEvents(contractAddress: string, contractName: string, startBlock: number | undefined, action: any) {
    // wait until new block is set
    this.logger.info(" * Waiting for network connection...");
    while (this.blockSubscription.startingBlockNumber === undefined) {
      await sleepms(500);
    }

    const ftsoContract = await getWeb3Contract(this.web3, contractAddress, contractName);
    let processBlock: number = this.blockSubscription.startingBlockNumber!;

    this.logger.info(" * Network event processing started");

    while (true) {
      // wait for new block
      if (processBlock >= this.blockSubscription.currentBlockNumber) {
        await sleepms(100);
        continue;
      }

      // process new block
      const events = await ftsoContract.getPastEvents("allEvents", { fromBlock: processBlock, toBlock: processBlock + 1 });

      this.logger.info(` * New block ${processBlock} with ${events.length} event(s)`);

      for (const event of events) {
        action(event);
      }

      processBlock++;
    }
  }
}
