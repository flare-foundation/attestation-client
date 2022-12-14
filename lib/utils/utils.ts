import { prefix0x, unPrefix0x } from "@flarenetwork/mcc";
import * as fs from "fs";
import glob from "glob";
import Web3 from "web3";
import { StateConnector } from "../../typechain-web3-v1/StateConnector";
import { getGlobalLogger } from "./logger";

export const DECIMALS = 5;

/**
 * Removes an element from an array.
 * @param array 
 * @param element 
 */
export function arrayRemoveElement(array: Array<any>, element: any) {
  const index = array.indexOf(element, 0);
  if (index > -1) {
    array.splice(index, 1);
  }
}

/**
 * Constructs a web3 instance connected to the RPC
 * @param rpcLink RPC link in form of http(s) or ws(s)
 * @param logger logger object (optional)
 * @returns 
 */
export function getWeb3(rpcLink: string, logger?: any): Web3 {
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
  return web3;
}

/**
 * Reads the artifact file produced by hardhat on path and extracts ABI of a smart contract.
 * @param abiPath path to the contract's JSON file, usually within `artifacts` folder
 * @returns ABI of the contract
 */
export function getAbi(abiPath: string) {
  let abi = JSON.parse(fs.readFileSync(abiPath).toString());
  if (abi.abi) {
    abi = abi.abi;
  }
  return abi;
}

/**
 * Constructs a Web3 contract object. It tries to find the ABI from the `artifacts` folder.
 * @param web3 Web3 object with the configured connection to the desired network
 * @param address Address of the contract
 * @param name Contract's name (as it appears in file name `ContractName.sol`)
 * @returns Web3 contract object
 */
export async function getWeb3Contract(web3: any, address: string, name: string) {
  let abiPath = "";
  try {
    abiPath = await relativeContractABIPathForContractName(name, "artifacts");
    return new web3.eth.Contract(getAbi(`artifacts/${abiPath}`), address);
  } catch (e: any) {
    console.error(`getWeb3Contract error - ABI not found (run yarn c): ${e}`);
  }
}

/**
 * Constructs correct `StateConnector` object, depending on the version which is old or new.
 * @param web3 Web3 object with the configured connection to the desired network
 * @param address Address of the contract
 * @returns StateConnector contract object
 */
export async function getWeb3StateConnectorContract(web3: any, address: string): Promise<StateConnector> {
  let abiPath = "";
  const artifacts = "artifacts";
  try {
    abiPath = await relativeContractABIPathForContractName("StateConnector", artifacts);
    return new web3.eth.Contract(getAbi(`${artifacts}/${abiPath}`), address) as StateConnector;
  } catch (e: any) {
    console.error(`getWeb3Contract error - ABI not found: ${e}`);
  }
}

/**
 * Constructs a Web3 wallet object
 * @param web3 Web3 object with the configured connection to the desired network
 * @param privateKey private key of the wallet
 * @returns wallet object
 */
export function getWeb3Wallet(web3: any, privateKey: string) {
  return web3.eth.accounts.privateKeyToAccount(prefix0x(privateKey));
}

/**
 * Factory for a finalization wrapper of transactions adapted to Flare networks. It waits for finalization by
 * polling the increase of nonce with exponential backoff. 
 * @param web3 Web3 object with the configured connection to the desired network
 * @returns 
 */
export function waitFinalize3Factory(web3: any) {
  return async (address: string, func: () => any, delay = 1000) => {
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

/**
 * Helper function for locating the contract ABI in `artifacts` folder, given the contract name
 * @param name contract name
 * @param artifactsRoot artifacts folder to search in, usually `artifacts`
 * @returns path to the compilation result file for the contract (containing ABI)
 */
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

/**
 * Limiter of a string length. Used for capping strings when writting to the database. Equipped with global logger.
 * @param text the input string
 * @param maxLength length limitation
 * @param reportOverflow logs limitation if true
 * @returns capped string
 */
export function prepareString(text: string, maxLength: number, reportOverflow: string = null): string {
  if (!text) return "";
  if (text.length < maxLength) return text;

  if (typeof text != "string") {
    getGlobalLogger().warning(`prepareString warning: expected type is string`);
    return text;
  }

  if (reportOverflow) {
    getGlobalLogger().warning(`prepareString warning: ${reportOverflow} overflow ${maxLength} (length=${text.length})`);
  }

  return text.substring(0, maxLength);
}

/**
 * Returns crypto safe 32-byte random hex string using web3.js generator
 * @returns Random 32-byte string
 */
export async function getCryptoSafeRandom(length = 32) {
  return Web3.utils.randomHex(length);
}

/**
 * Reads the address from a temporary file. Used in some testings
 * @returns the address
 */
export function getTestStateConnectorAddress() {
  return fs.readFileSync(".stateconnector-address").toString();
}

/**
 * Helper function to provide wei value for given eth value
 * @param web3 Web3 object
 * @param eth 
 * @returns 
 */
export function etherToValue(web3: Web3, eth: number) {
  return web3.utils.toWei(web3.utils.toBN(eth), "ether");
}

/**
 * Current unix epoch (in seconds)
 * @returns unix epoch of now
 */
export function getUnixEpochTimestamp() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Sleep function
 * @param milliseconds time to sleep
 */
export async function sleepms(milliseconds: number) {
  await new Promise((resolve: any) => {
    setTimeout(() => {
      resolve();
    }, milliseconds);
  });
}

/**
 * Rounds a number to a given number of decimals
 * @param x given number
 * @param decimal decimals to round
 * @returns 
 */
export function round(x: number, decimal = 0) {
  if (decimal === 0) return Math.round(x);

  const dec10 = 10 ** decimal;

  return Math.round(x * dec10) / dec10;
}

// 
/**
 * Helper for parsing Maps.
 * Use in JSON.parse( x , JSONMapParser ) to load Map saved with above function
 * @param key not used, just for compatibility 
 * @param value the map to be parsed
 * @returns the Map parsed from JSON.
 */
export function JSONMapParser(key: any, value: any) {
  if (typeof value === "object" && value !== null) {
    if (value.dataType === "Map") {
      return new Map(value.value);
    }
  }
  return value;
}

/**
 * Time formatter
 * @param time given time as a number (unix epoch in seconds)
 * @param secDecimals decimals to round seconds
 * @returns 
 */
export function secToHHMMSS(time: number, secDecimals = 0) {
  const days = Math.floor(time / (3600 * 24));
  let hours = Math.floor(time / 3600);
  const minutes = Math.floor((time - hours * 3600) / 60);
  const seconds = round(time - hours * 3600 - minutes * 60, secDecimals);

  hours = hours % 24;

  let sdays = "";

  if (days > 0) {
    sdays = days.toString() + " ";
  }

  const shours: string = hours.toString().padStart(2, "0");
  const smin: string = minutes.toString().padStart(2, "0");
  const ssec: string = seconds.toString().padStart(2, "0");

  return sdays + shours + ":" + smin + ":" + ssec;
}

/**
 * XOR function on two 32-byte hex strings
 * @param hex1 
 * @param hex2 
 * @returns the XOR of the two values
 */
export function xor32(hex1: string, hex2: string) {
  const h1 = unPrefix0x(hex1);
  const h2 = unPrefix0x(hex2);
  if (!(/^[a-fA-F0-9]{64}$/.test(h1) && /^[a-fA-F0-9]{64}$/.test(h2))) {
    throw new Error("Incorrectly formatted 32-byte strings");
  }
  const buf1 = Buffer.from(h1, "hex");
  const buf2 = Buffer.from(h2, "hex");
  const bufResult = buf1.map((b, i) => b ^ buf2[i]);
  return prefix0x(Buffer.from(bufResult).toString("hex"));
}


/**
 * print out typeorm query with parameters
 * @param query 
 */
export function queryPrint(query: any) {
  let [sql, params] = query.getQueryAndParameters();
  params.forEach((value) => {
    if (typeof value === 'string') {
      sql = sql.replace('?', `"${value}"`);
    }
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        sql = sql.replace(
          '?',
          value.map((element) => (typeof element === 'string' ? `"${element}"` : element)).join(','),
        );
      } else {
        sql = sql.replace('?', value);
      }
    }
    if (['number', 'boolean'].includes(typeof value)) {
      sql = sql.replace('?', value.toString());
    }
  });

  console.log(sql);
}

