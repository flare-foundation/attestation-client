import Web3 from "web3";
import { getTimeMilli } from "./internetTime";
import { AttLogger, logException } from "./logger";
import { getUnixEpochTimestamp, getWeb3Wallet, sleepms, waitFinalize3Factory } from "./utils";
import { stringify } from "safe-stable-stringify";

export const DEFAULT_GAS = "2500000";
export const DEFAULT_GAS_PRICE = "300000000000";

export class Web3Functions {
  logger: AttLogger;

  web3: Web3;
  account: any;
  provider: any;

  waitFinalize3: any;

  nonce: number | undefined; // if undefined, we retrieve it from blockchain, otherwise we use it

  //submissionQueue = new Array<()=>any>();

  nextIndex = 0;
  currentIndex = 0;

  working = false;

  constructor(logger: AttLogger, web3: Web3, privateKey: string) {
    this.logger = logger;

    this.web3 = web3;

    this.account = getWeb3Wallet(this.web3, privateKey);

    this.waitFinalize3 = waitFinalize3Factory(this.web3);
  }

  async getNonce(): Promise<string> {
    this.nonce = await this.web3.eth.getTransactionCount(this.account.address);

    return this.nonce + ""; // string returned
  }

  public async getBlock(blockNumber: number): Promise<any> {
    return await this.web3.eth.getBlock(blockNumber);
  }

  public async getBlockNumber(): Promise<number> {
    return await this.web3.eth.getBlockNumber();
  }

  public setTransactionPollingTimeout(timeout: number) {
    this.web3.eth.transactionPollingTimeout = timeout;
  }

  async signAndFinalize3(
    label: string,
    toAddress: string,
    fnToEncode: any,
    timeEnd?: number,
    gas: string = DEFAULT_GAS,
    gasPrice: string = DEFAULT_GAS_PRICE,
    quiet = false
  ): Promise<any> {
    try {
      const waitIndex = this.nextIndex;
      this.nextIndex += 1;

      const time0 = getTimeMilli();

      if (waitIndex !== this.currentIndex) {
        if (!quiet) {
          this.logger.debug2(`sign ${label} wait #${waitIndex}/${this.currentIndex}`);
        }

        while (waitIndex !== this.currentIndex) {
          if (timeEnd) {
            if (getUnixEpochTimestamp() > timeEnd) {
              this.logger.error2(`sign ${label} timeout #${waitIndex}`);

              // must return 2 values as _signAndFinalize3
              // for some reason the return {null,null}; does not compile
              const res0 = null;
              const res1 = null;
              return { res0, res1 };
            }
          }

          await sleepms(100);
        }
      }

      if (!quiet) {
        this.logger.debug2(`sign ${label} start #${waitIndex}`);
      }

      const res = await this._signAndFinalize3(label, toAddress, fnToEncode, gas, gasPrice);

      const time1 = getTimeMilli();

      if (!quiet) {
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

  async _signAndFinalize3(label: string, toAddress: string, fnToEncode: any, gas: string = DEFAULT_GAS, gasPrice: string = DEFAULT_GAS_PRICE): Promise<any> {
    try {
      const nonce = await this.getNonce();
      const tx = {
        from: this.account.address,
        to: toAddress,
        gas,
        gasPrice,
        data: fnToEncode.encodeABI(),
        nonce,
      };
      const signedTx = await this.account.signTransaction(tx);

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
        return null;
      }
    } catch (error) {
      logException(error, `_signAndFinalize3`);
    }
  }
}
