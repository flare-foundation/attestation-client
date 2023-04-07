import { stringify } from "safe-stable-stringify";
import Web3 from "web3";
import { AttesterWebOptions } from "../../attester/configs/AttesterWebOptions";
import { getTimeMs } from "./internetTime";
import { AttLogger, logException } from "../logging/logger";
import { retry } from "./promiseTimeout";
import { getUnixEpochTimestamp, sleepms } from "./utils";
import { getWeb3Wallet, waitFinalize3Factory } from "./web3-utils";

export interface ExtendedReceipt {
  receipt?: any;
  nonce?: number;
}

/**
 * Helper class for signing transactions and calling specific queries on Flare blockchain.
 */
export class Web3Functions {
  logger: AttLogger;
  web3Options: AttesterWebOptions;
  web3: Web3;
  account: any;

  private waitFinalize3: any;

  nextIndex = 0;
  currentIndex = 0;

  constructor(logger: AttLogger, web3: Web3, web3Options: AttesterWebOptions) {
    this.logger = logger;
    this.web3Options = web3Options;
    this.web3 = web3;
    this.account = getWeb3Wallet(this.web3, this.web3Options.accountPrivateKey);
    this.logger.info(`Sending from address ${this.account.address}`);
    this.waitFinalize3 = waitFinalize3Factory(this.web3);
  }

  private get gasLimit(): string {
    return this.web3Options.gasLimit;
  }

  /**
   * Calculates gas price for the transaction, based on the network gas price and the addition.
   * @returns gas price in wei
   */
  private async gasPrice(): Promise<string> {
    return retry(`Web3Function::gasPrice`, async () => {
      const gasPriceAddition = parseInt(this.web3Options.gasPriceAddition, 10);
      const gasPriceNetwork = parseInt(await this.web3.eth.getGasPrice(), 10);
      const gasPrice = gasPriceNetwork + gasPriceAddition;
      return gasPrice.toString();
    });
  }

  /**
   * Calculates nonce for the account.
   * @returns nonce for the account
   */
  private async getNonce(): Promise<number> {
    return retry(`Web3Function::getNonce`, async () => {
      const nonce = await this.web3.eth.getTransactionCount(this.account.address);
      return parseInt(nonce + "");
    });
  }

  /**
   * Given a block number it returns the block data.
   * @param blockNumber
   * @returns
   */
  public async getBlock(blockNumber: number): Promise<any> {
    return retry(`Web3Function::getBlock`, async () => this.web3.eth.getBlock(blockNumber));
  }

  /**
   * Returns the last block number.
   * @returns
   */
  public async getBlockNumber(): Promise<number> {
    return retry(`Web3Function::getBlockNumber`, async () => this.web3.eth.getBlockNumber());
  }

  /**
   * Signs and finalizes (waits for account nonce increase) a contract interaction.
   * It also handles obtaining revert messages upon revert, provides additional logging,
   * timeout handling and transaction sequencing.
   * @param label - logging label
   * @param toAddress - signing (sender) address
   * @param fnToEncode - web3 function call
   * @param timeEnd - deadline for waiting to receive the transaction receipt
   * @param verbose
   * @returns
   */
  public async signAndFinalize3Sequenced(label: string, toAddress: string, fnToEncode: any, timeEnd?: number, verbose = true): Promise<ExtendedReceipt> {
    try {
      const waitIndex = this.nextIndex;
      this.nextIndex += 1;
      const time0 = getTimeMs();

      if (waitIndex !== this.currentIndex) {
        if (verbose) {
          this.logger.debug2(`sign ${label} wait #${waitIndex}/${this.currentIndex}`);
        }
        while (waitIndex !== this.currentIndex) {
          if (timeEnd) {
            if (getUnixEpochTimestamp() > timeEnd) {
              this.logger.error2(`sign ${label} timeout #${waitIndex}`);
              return {};
            }
          }
          await sleepms(100);
        }
      }

      if (verbose) {
        this.logger.debug2(`sign ${label} start #${waitIndex}`);
      }

      const res = await this._signAndFinalize3(label, toAddress, fnToEncode);
      const time1 = getTimeMs();

      if (verbose) {
        this.logger.debug2(`sign ${label} done #${waitIndex} (time ${time1 - time0}ms)`);
      }

      return res;
    } catch (error) {
      logException(error, `signAndFinalize3`);
    } finally {
      // current index MUST be increased or everything stalls
      this.currentIndex++;
      this.logger.debug(`sign ${label} index inc (#${this.currentIndex})`);
    }
  }

  /**
   * Signs and finalizes (waits for account nonce increase) a contract interaction.
   * It also handles obtaining revert messages upon revert.
   * @param label - logging label
   * @param toAddress - signing (sender) address
   * @param fnToEncode - web3 function call
   * @returns
   */
  private async _signAndFinalize3(label: string, toAddress: string, fnToEncode: any): Promise<any> {
    try {
      const nonce = await this.getNonce();
      const gasPrice = await this.gasPrice();
      const tx = {
        from: this.account.address,
        to: toAddress,
        gas: this.gasLimit,
        gasPrice: gasPrice,
        data: fnToEncode.encodeABI(),
        nonce,
      };
      const signedTx = await this.account.signTransaction(tx);
      this.logger.info(`Gas price used: ${gasPrice}`);
      try {
        const receipt = await this.waitFinalize3(this.account.address, () => this.web3.eth.sendSignedTransaction(signedTx.rawTransaction!));
        return { receipt, nonce };
      } catch (e: any) {
        if (e.message.indexOf(`Transaction has been reverted by the EVM`) < 0) {
          logException(`${label}, nonce sent: ${nonce}`, e);
        } else {
          try {
            const result = await fnToEncode.call({ from: this.account.address });
            throw Error("unlikely to happen: " + stringify(result));
          } catch (revertReason) {
            this.logger.error2(`${label}, nonce sent: ${nonce}, revert reason: ${revertReason}`);
          }
        }
        return {};
      }
    } catch (error) {
      logException(error, `_signAndFinalize3`);
    }
  }
}
