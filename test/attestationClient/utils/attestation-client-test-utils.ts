import * as fs from "fs";
import Web3 from "web3";
import BN from "bn.js";
const { promisify } = require('util');
import { AttesterClient } from "../../../src/attester/AttesterClient";
import { AttesterConfig } from "../../../src/attester/AttesterConfig";
import { readSecureConfig } from "../../../src/utils/configSecure";
import { getWeb3, relativeContractABIPathForContractName } from "../../../src/utils/utils";
import { BitVoting } from "../../../typechain-web3-v1/BitVoting";
import { StateConnectorTempTran } from "../../../typechain-web3-v1/StateConnectorTempTran";
import { readJSONfromFile } from "../../../src/utils/json";

// CONFIG_PATH should be set correctly
export async function bootstrapAttestationClient(n: number): Promise<AttesterClient> {
   process.env.IN_MEMORY_DB = "1";
   // Reading configuration
   const config = await readSecureConfig(new AttesterConfig(), `attester_${n}`);

   // Create and start Attester Client
   return new AttesterClient(config);
   // await attesterClient.runAttesterClient();
}

export async function deployTestContracts(web3Rpc: string = "http://127.0.0.1:8545", accountPrivateKey = "0xc5e8f61d1ab959b397eecc0a37a6517b8e67a0e7cf1f4bce5591f3ed80199122", verbose = false) {
   const web3 = getWeb3(web3Rpc);
   const artifacts = "artifacts";
   let abiPathStateConnector = await relativeContractABIPathForContractName("StateConnectorTempTran", artifacts);
   let abiPathBitVoting = await relativeContractABIPathForContractName("BitVoting", artifacts);
   let stateConnectorABI = JSON.parse(fs.readFileSync(`${artifacts}/${abiPathStateConnector}`).toString());
   let bitVotingABI = JSON.parse(fs.readFileSync(`${artifacts}/${abiPathBitVoting}`).toString());
   let stateConnector = new web3.eth.Contract(stateConnectorABI.abi) as any as StateConnectorTempTran;
   let bitVoting = new web3.eth.Contract(bitVotingABI.abi) as any as BitVoting;
   const wallet = web3.eth.accounts.privateKeyToAccount(accountPrivateKey);
   let nonce = await web3.eth.getTransactionCount(wallet.address);
   let chainId = await web3.eth.getChainId();

   const stateConnectorData = stateConnector
      .deploy({
         data: stateConnectorABI.bytecode,
         arguments: [wallet.address],
      })
      .encodeABI();

   const bitVotingData = bitVoting
      .deploy({
         data: bitVotingABI.bytecode
      })
      .encodeABI();

   const txStateConnector = {
      from: wallet.address,
      gas: "0x" + web3.utils.toBN(1500000).toString(16),
      gasPrice: "0x" + web3.utils.toBN("25000000000").toString(16),
      chainId,
      nonce,
      data: stateConnectorData,
   };

   const txBitVoting = {
      from: wallet.address,
      gas: "0x" + web3.utils.toBN(1500000).toString(16),
      gasPrice: "0x" + web3.utils.toBN("25000000000").toString(16),
      chainId: chainId,
      nonce: nonce + 1,
      data: bitVotingData,
   };


   try {
      const signed = await wallet.signTransaction(txStateConnector);
      const rec = await web3.eth.sendSignedTransaction(signed.rawTransaction);
      if (verbose) console.log(`${rec.contractAddress} (StateConnector)`);
   } catch (e) {
      console.log("Transaction failed.");
      console.log(e);
   }

   try {
      const signed = await wallet.signTransaction(txBitVoting);
      const rec = await web3.eth.sendSignedTransaction(signed.rawTransaction);
      if (verbose) console.log(`${rec.contractAddress} (BitVoting)`);
   } catch (e) {
      console.log("Transaction failed.");
      console.log(e);
   }

}

export async function submitAttestationRequest(stateConnector: StateConnectorTempTran, web3: Web3, wallet: any, request: string) {
   const data = stateConnector.methods.requestAttestations(request).encodeABI();
   let nonce = await web3.eth.getTransactionCount(wallet.address);
   let chainId = await web3.eth.getChainId();

   const txStateConnector = {
      from: wallet.address,
      to: stateConnector.options.address,
      gas: "0x" + web3.utils.toBN(1500000).toString(16),
      gasPrice: "0x" + web3.utils.toBN("25000000000").toString(16),
      chainId,
      nonce,
      data,
   };

   const signed = await wallet.signTransaction(txStateConnector);
   return await web3.eth.sendSignedTransaction(signed.rawTransaction);
}
// process.env.TEST_CREDENTIALS = "1"
// process.env.CONFIG_PATH = CONFIG_PATH;


////////////////////////////////////////////////////////////////
// Adopted from @openzepplin/test-helper
////////////////////////////////////////////////////////////////

export function advanceBlock(web3: Web3) {
   return promisify((web3.currentProvider as any).send.bind(web3.currentProvider))({
      jsonrpc: '2.0',
      method: 'evm_mine',
      id: new Date().getTime(),
   });
}

// Advance the block to the passed height
export async function advanceBlockTo(web3: Web3, target: string | number | BN) {
   if (!BN.isBN(target)) {
      target = new BN(target);
   }

   const currentBlock = (await latestBlock(web3));
   const start = Date.now();
   let notified;
   if (target.lt(currentBlock)) throw Error(`Target block #(${target}) is lower than current block #(${currentBlock})`);
   while ((await latestBlock(web3)).lt(target)) {
      if (!notified && Date.now() - start >= 5000) {
         notified = true;
         console.log(`advanceBlockTo: Advancing too many blocks is causing this test to be slow.`);
      }
      await advanceBlock(web3);
   }
}

// Returns the time of the last mined block in seconds
export async function latest(web3: Web3) {
   const block = await web3.eth.getBlock('latest');
   return new BN(block.timestamp);
}

export async function latestBlock(web3: Web3) {
   const block = await web3.eth.getBlock('latest');
   return new BN(block.number);
}

// Increases ganache time by the passed duration in seconds
async function increase(web3: Web3, duration: string | number | BN) {
   if (!BN.isBN(duration)) {
      duration = new BN(duration);
   }

   if (duration.isNeg()) throw Error(`Cannot increase time by a negative amount (${duration})`);

   await promisify((web3.currentProvider as any).send.bind(web3.currentProvider))({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [duration.toNumber()],
      id: new Date().getTime(),
   });

   await advanceBlock(web3);
}

/**
 * Beware that due to the need of calling two separate ganache methods and rpc calls overhead
 * it's hard to increase time precisely to a target point so design your test to tolerate
 * small fluctuations from time to time.
 *
 * @param target time in seconds
 */
export async function increaseTo(web3: Web3, target: string | number | BN) {
   if (!BN.isBN(target)) {
      target = new BN(target);
   }

   const now = (await latest(web3));

   if (target.lt(now)) throw Error(`Cannot increase current time (${now}) to a moment in the past (${target})`);
   const diff = target.sub(now);
   return increase(web3, diff);
}


export async function getVoterAddresses(n = 9) {
   let voters = [];
   if(n < 1 || n > 9 || n !== Math.floor(n)) {
      throw new Error(`Value of 'n' should be between 1 and 9, integer`);
   }
   const web3 = new Web3();
   for(let i = 0; i < n; i++) {
      // console.log("XXX", fs.readFileSync(`./test/attestationClient/test-data/attester/attester_${i}-config.json`).toString())
      let json = readJSONfromFile<any>(`./test/attestationClient/test-data/attester/attester_${i}-config.json`);
      let account = web3.eth.accounts.privateKeyToAccount(json.web.accountPrivateKey);
      voters.push(account.address);
   }
   return voters;
}