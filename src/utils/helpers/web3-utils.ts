import { prefix0x } from "@flarenetwork/mcc";
import * as fs from "fs";
import glob from "glob";
import Web3 from "web3";
import { StateConnector } from "../../../typechain-web3-v1/StateConnector";

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
  if (process.env.TEST_HARDHAT_NODE) {
    web3.eth.handleRevert = false;
  } else {
    web3.eth.handleRevert = true;
  }
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
    abiPath = await relativeContractABIPathForContractName(process.env.TEST_STATE_CONNECTOR ? "StateConnectorTempTran" : "StateConnector", artifacts);
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
  const files = await glob(`contracts/**/${name}.sol/${name}.json`, { cwd: artifactsRoot });
  if (files && files.length === 1) {
    return files[0];
  }
  throw new Error(`Not a unique file: ${files.toString()}`);
}

/**
 * Helper function that converts wei to decimal.
 * @param value
 * @param digitsToInteger
 * @returns
 */
export function weiToDecimal(value: bigint, digitsToInteger: number = 18): bigint {
  const oneUnit = BigInt(10) ** BigInt(digitsToInteger);
  return value / oneUnit;
}
