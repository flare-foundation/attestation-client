import fs from "fs";
import { AbiItem } from "web3-utils";
import * as yargs from "yargs";
import StateConnectorAbi from "../../artifacts/contracts/StateConnectorTemp.sol/StateConnectorTemp.json";
import StateConnectorTranAbi from "../../artifacts/contracts/StateConnectorTempTran.sol/StateConnectorTempTran.json";
import { StateConnectorTemp } from "../../typechain-web3-v1/StateConnectorTemp";
import { StateConnectorTempTran } from "../../typechain-web3-v1/StateConnectorTempTran";
import { getWeb3 } from "../utils/helpers/web3-utils";

async function deployTempStateConnector(web3Rpc: string, flavor: string) {
  const web3 = getWeb3(web3Rpc);

  const chainId = await web3.eth.getChainId();

  // State connector
  const AbiItemForDeploy = flavor === "tran" ? StateConnectorTranAbi : StateConnectorAbi;

  let stateConnectorContract: StateConnectorTemp | StateConnectorTempTran =
    flavor === "tran"
      ? (new web3.eth.Contract(AbiItemForDeploy.abi as AbiItem[]) as any as StateConnectorTemp)
      : (new web3.eth.Contract(AbiItemForDeploy.abi as AbiItem[]) as any as StateConnectorTempTran);

  let botPrivateKey = "";
  if (process.env.FINALIZING_BOT_PRIVATE_KEY) {
    botPrivateKey = process.env.FINALIZING_BOT_PRIVATE_KEY;
  } else {
    console.error("No FINALIZING_BOT_PRIVATE_KEY provided in env");
    throw new Error("No FINALIZING_BOT_PRIVATE_KEY provided in env");
  }

  let botPublicKey = "";
  if (process.env.FINALIZING_BOT_PUBLIC_KEY) {
    botPublicKey = process.env.FINALIZING_BOT_PUBLIC_KEY;
  } else {
    console.error("No FINALIZING_BOT_PUBLIC_KEY provided in env");
    throw new Error("No FINALIZING_BOT_PUBLIC_KEY provided in env");
  }

  const botWallet = web3.eth.accounts.privateKeyToAccount(botPrivateKey);
  if (botWallet.address.toLowerCase() !== botPublicKey.toLowerCase()) {
    const message = "Private and public key mismatch";
    console.error(message);
    throw new Error(message);
  }

  const constructorData = stateConnectorContract
    .deploy({
      data: AbiItemForDeploy.bytecode,
      arguments: [botWallet.address],
    })
    .encodeABI();

  let gasDec = 1500000;
  let gasPriceDec = 25000000000;

  const tx = {
    from: botWallet.address,
    gas: "0x" + gasDec.toString(16),
    gasPrice: "0x" + gasPriceDec.toString(16),
    chainId: chainId,
    data: constructorData,
  };

  try {
    const signed = await botWallet.signTransaction(tx);
    const rec = await web3.eth.sendSignedTransaction(signed.rawTransaction);
    console.log(rec);
    fs.writeFileSync(".tmp-state-connector-address", rec.contractAddress);
  } catch (e) {
    console.log("Unsuccessfully round finalization");
    console.log(e);
  }
}

const args = yargs
  .scriptName("testStateConnector")
  .option("r", {
    alias: "rpc",
    describe: "Rpc url",
    demandOption: "Provide rpc url",
    type: "string",
    nargs: 1,
    default: "http://127.0.0.1:8545",
  })
  .option("f", {
    alias: "flavor",
    describe: "Which flavor of stateconn to deploy",
    default: "temp",
    choices: ["temp", "tran"],
    type: "string",
    nargs: 1,
  }).argv;

const { rpc, flavor } = args as any;

deployTempStateConnector(rpc, flavor)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
