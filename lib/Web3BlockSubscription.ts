import Web3 from "web3";
import { Logger } from "winston";
import { getWeb3 } from "./utils";

export class Web3BlockSubscription {
  logger: Logger;

  web3: Web3;

  startingBlockNumber: number | undefined;
  currentBlockNumber: number = 0;

  url: string;

  constructor(logger: Logger, url: string) {
    this.logger = logger;

    this.url = url;
    this.web3 = getWeb3(url, logger);

    this.subscribeToNetworkBlockHeaders();
  }

  async subscribeToBlocks(func: (blockInfo: any) => void) {
    this.logger.info(` * Connecting to network '${this.url}'...`);
    const subscription = this.web3.eth
      .subscribe("newBlockHeaders", (error, result) => {
        if (error) {
          console.error(error);
        } else {
          // do nothing: use on("data")
        }
      })
      .on("connected", (subscriptionId) => {
        this.logger.info(` * Connected to network ${subscriptionId}`);
      })
      .on("data", (blockHeader) => {
        func(blockHeader);
      })
      .on("error", console.error);

    return subscription;
  }

  subscribeToNetworkBlockHeaders() {
    this.subscribeToBlocks(async (blockInfo: any) => {
      if (this.startingBlockNumber === undefined) {
        this.logger.info(`   # Network start block #${blockInfo.number}`);
        this.startingBlockNumber = blockInfo.number;
      }
      this.currentBlockNumber = blockInfo.number;
    });
  }
}
