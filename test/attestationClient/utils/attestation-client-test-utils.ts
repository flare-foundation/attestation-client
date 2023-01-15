import * as fs from "fs";
import { AttesterClient } from "../../../src/attester/AttesterClient";
import { AttesterConfig } from "../../../src/attester/AttesterConfig";
import { readSecureConfig } from "../../../src/utils/configSecure";
import { getWeb3, relativeContractABIPathForContractName } from "../../../src/utils/utils";
import { BitVoting } from "../../../typechain-web3-v1/BitVoting";
import { StateConnectorTempTran } from "../../../typechain-web3-v1/StateConnectorTempTran";


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
      if(verbose) console.log(`${rec.contractAddress} (StateConnector)`);
   } catch (e) {
      console.log("Transaction failed.");
      console.log(e);
   }

   try {
      const signed = await wallet.signTransaction(txBitVoting);
      const rec = await web3.eth.sendSignedTransaction(signed.rawTransaction);
      if(verbose) console.log(`${rec.contractAddress} (BitVoting)`);
   } catch (e) {
      console.log("Transaction failed.");
      console.log(e);
   }

}

// process.env.TEST_CREDENTIALS = "1"
// process.env.CONFIG_PATH = CONFIG_PATH;
