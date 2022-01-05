import Web3 from "web3";
import { Logger } from "winston";
import { getWeb3Wallet, waitFinalize3Factory } from "./utils";

const DEFAULT_GAS = "2500000";
const DEFAULT_GAS_PRICE = "225000000000";

export class Web3Functions {
  logger: Logger;

  web3: Web3;
  account: any;
  provider: any;

  waitFinalize3: any;

  nonce: number | undefined; // if undefined, we retrieve it from blockchain, otherwise we use it

  constructor(logger: Logger, web3: Web3, privateKey: string) {
    this.logger = logger;

    this.web3 = web3;

    this.account = getWeb3Wallet(this.web3, privateKey);

    this.waitFinalize3 = waitFinalize3Factory(this.web3);
  }

  async getNonce(): Promise<string> {
    this.nonce = await this.web3.eth.getTransactionCount(this.account.address);

    return this.nonce + ""; // string returned
  }

  async signAndFinalize3(label: string, toAddress: string, fnToEncode: any, gas: string = DEFAULT_GAS, gasPrice: string = DEFAULT_GAS_PRICE): Promise<any> {
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
      return receipt;
    } catch (e: any) {
      if (e.message.indexOf("Transaction has been reverted by the EVM") < 0) {
        this.logger.error(`${label} | Nonce sent: ${nonce} | signAndFinalize3 error: ${e.message}`);
      } else {
        fnToEncode
          .call({ from: this.account.address })
          .then((result: any) => {
            throw Error("unlikely to happen: " + JSON.stringify(result));
          })
          .catch((revertReason: any) => {
            this.logger.error(`${label} | Nonce sent: ${nonce} | signAndFinalize3 error: ${revertReason}`);
          });
      }
      return null;
    }
  }
}
