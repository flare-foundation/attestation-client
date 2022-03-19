import BN from "bn.js";
import { ethers } from "ethers";
import { prefix0x, toBN } from "flare-mcc";
import * as fs from "fs";
import glob from "glob";
import Web3 from "web3";
import { getGlobalLogger } from "./logger";

export const DECIMALS = 5;

export function partBN(x: BN, bitOffset: number, bitCount: number) {
  const bitMask = toBN(1).shln(bitCount).sub(toBN(1));
  const a = x.shrn(bitOffset);
  return a.and(bitMask);
}

export function partBNbe(x: BN, bitOffset: number, bitCount: number) {
  return partBN(x, 256 - bitOffset - bitCount, bitCount);
}

export function toHex(x: string | number | BN, padToBytes?: number) {
  if (padToBytes as any > 0) {
    return Web3.utils.leftPad(Web3.utils.toHex(x), padToBytes! * 2);
  }
  return Web3.utils.toHex(x);
}

export function arrayRemoveElement(array: Array<any>, element: any) {
  const index = array.indexOf(element, 0);
  if (index > -1) {
    array.splice(index, 1);
  }
}

// export function getProvider(rpcLink: string): ethers.providers.Provider {
//   return new ethers.providers.JsonRpcProvider(rpcLink);
// }

export function getWeb3(rpcLink: string, logger?: any) {
  const web3 = new Web3();
  if (rpcLink.startsWith("http")) {
    web3.setProvider(new Web3.providers.HttpProvider(rpcLink));
  } else if (rpcLink.startsWith("ws")) {
    const provider = new Web3.providers.WebsocketProvider(rpcLink, {
      // @ts-ignore
      clientConfig: {
        keepalive: true,
        keepaliveInterval: 60000, // milliseconds
      },
      reconnect: {
        auto: true,
        delay: 2500,
        onTimeout: true,
      },
    });
    provider.on("close", () => {
      if (logger) {
        logger.error(` ! Network WS connection closed.`);
      }
    });
    web3.setProvider(provider);
  }
  web3.eth.handleRevert = true;
  // web3.eth.defaultCommon = { customChain: { name: 'coston', chainId: 20210413, networkId: 20210413 }, baseChain: 'ropsten', hardfork: 'petersburg' };
  //    }
  return web3;
}

export function getAbi(abiPath: string) {
  let abi = JSON.parse(fs.readFileSync(abiPath).toString());
  if (abi.abi) {
    abi = abi.abi;
  }
  return abi;
}

export async function getWeb3Contract(web3: any, address: string, name: string) {
  let abiPath = "";
  try {
    abiPath = await relativeContractABIPathForContractName(name, "artifacts");
    return new web3.eth.Contract(getAbi(`artifacts/${abiPath}`), address);
  } catch (e: any) {
    try {
      abiPath = await relativeContractABIPathForContractName(name, "data/artifacts");
      return new web3.eth.Contract(getAbi(`data/artifacts/${abiPath}`), address);
    }
    catch( e2 ) {
      console.error( `getWeb3Contract error - ABI not found (run yarn c): ${e2}` );
    }
  }
}

export async function getContract(provider: any, address: string, name: string) {
  let abiPath = "";
  try {
    abiPath = await relativeContractABIPathForContractName(name, "artifacts");
    return new ethers.Contract(address, getAbi(`artifacts/${abiPath}`), provider);
  } catch (e: any) {
    abiPath = await relativeContractABIPathForContractName(name, "data/artifacts");
    return new ethers.Contract(address, getAbi(`data/artifacts/${abiPath}`), provider);
  }
}

export function getWeb3Wallet(web3: any, privateKey: string) {
  return web3.eth.accounts.privateKeyToAccount(prefix0x(privateKey));
}

export function getWallet(privateKey: string, provider: any): ethers.Wallet {
  return new ethers.Wallet(privateKey, provider);
}

export function waitFinalize3Factory(web3: any) {
  return async (address: string, func: () => any, delay: number = 1000) => {
    const nonce = await web3.eth.getTransactionCount(address);
    const res = await func();
    const backoff = 1.5;
    let cnt = 0;
    while ((await web3.eth.getTransactionCount(address)) === nonce) {
      await new Promise((resolve: any) => {
        setTimeout(() => {
          resolve();
        }, delay);
      });
      if (cnt < 8) {
        delay = Math.floor(delay * backoff);
        cnt++;
      } else {
        throw new Error("Response timeout");
      }
      console.log(`Delay backoff ${delay} (${cnt})`);
    }
    return res;
  };
}

// export function bigNumberToMillis(num: number) {
//   return BigNumber.from(num * 1000);
// }

// export function priceHash(price: number | BN | BigNumber, random: number | BN | BigNumber, address: string): string {
//   return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "address"], [price.toString(), random.toString(), address]));
// }

export async function relativeContractABIPathForContractName(name: string, artifactsRoot = "artifacts"): Promise<string> {
  return new Promise((resolve, reject) => {
    glob(`contracts/**/${name}.sol/${name}.json`, { cwd: artifactsRoot }, (er: any, files: string[] | null) => {
      if (er) {
        reject(er);
      } else {
        if (files && files.length === 1) {
          resolve(files[0]);
        } else {
          reject(files);
        }
      }
    });
  });
}

export function prepareString(text: string, maxLength: number, reportOwerflow: string = null): string {
  if (!text) return "";
  if (text.length < maxLength) return text;

  if (typeof text != "string") {
    getGlobalLogger().warning(`prepareString warning: expected type is string`);
    return text;
  }

  if (reportOwerflow) {
    getGlobalLogger().warning(`prepareString warning: ${reportOwerflow} overflow ${maxLength} (length=${text.length})`);
  }

  return text.substring(0, maxLength - 1);
}

export function getSimpleRandom(maxnum: number) : number {
  return Math.floor( Math.random() * maxnum );
}


export async function getRandom(minnum: number = 0, maxnum: number = 10 ** 5) {
  const randomNumber = require("random-number-csprng");
  return await randomNumber(minnum, maxnum);
}

export async function getCryptoSafeRandom() {
  return Web3.utils.toBN(Web3.utils.randomHex(32));
};

export function getTestStateConnectorAddress() {
  return fs.readFileSync(".stateconnector-address").toString();
}

export function etherToValue(web3: Web3, eth: number) {
  return web3.utils.toWei(web3.utils.toBN(eth), "ether");
}

// time
export function getUnixEpochTimestamp() {
  return Math.floor(Date.now() / 1000);
}

export async function sleepms(milliseconds: number) {
  await new Promise((resolve: any) => {
    setTimeout(() => {
      resolve();
    }, milliseconds);
  });
}

export function prettyPrintObject(normalized: any) {
  let res: any = {};
  for (let key in normalized) {
    let obj = (normalized as any)[key];
    if (typeof obj === "object") {
      res[key] = (normalized as any)[key]?.toString();
    } else {
      res[key] = (normalized as any)[key];
    }
  }
  console.log(JSON.stringify(res, null, 2));
}

export function round(x: number, decimal: number = 0) {
  if (decimal === 0) return Math.round(x);

  const dec10 = 10 ** decimal;

  return Math.round(x * dec10) / dec10;
}

export function extractBNPaymentReference(paymentReference: string | string[] | BN | BN[]): BN {
  try {
    let len = (paymentReference as any).length;
    // handle lists
    if (len !== undefined) {
      if (len === 1) {
        return toBN((paymentReference as any[])[0]);
      } else {
        return toBN(0);
      }
    }
    // handle values
    return toBN(paymentReference as any);
  } catch (e) {
    return toBN(0);
  }
}

// use in JSON.stringify( x , JSONMapParser ) to save Map
export function JSONMapStringify(key: any, value: any) {
  if (value instanceof Map) {
    return {
      dataType: "Map",
      value: Array.from(value.entries()), // or with spread: value: [...value]
    };
  } else {
    return value;
  }
}

// use in JSON.parse( x , JSONMapParser ) to load Map saved with above function
export function JSONMapParser(key: any, value: any) {
  if (typeof value === "object" && value !== null) {
    if (value.dataType === "Map") {
      return new Map(value.value);
    }
  }
  return value;
}



export function secToHHMMSS(time: number, secDecimals=0)
{
    const hours   = Math.floor(time / 3600);
    const minutes = Math.floor((time - (hours * 3600)) / 60);
    const seconds = round( time - (hours * 3600) - (minutes * 60) , secDecimals );

    const shours : string = hours.toString().padStart(2,"0")
    const smin : string = minutes.toString().padStart(2,"0")
    const ssec : string = seconds.toString().padStart(2,"0")

    return shours+':'+smin+':'+ssec;
}
