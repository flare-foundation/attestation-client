import { AbiItem } from "web3-utils";
import StateConnectorAbi from "../../artifacts/contracts/StateConnectorTemp.sol/StateConnectorTemp.json";
import { StateConnectorTemp } from "../../typechain-web3-v1/StateConnectorTemp";
import { getWeb3 } from "../utils/utils";

async function deployTempStateConnector(web3Rpc: string) {
  const web3 = getWeb3(web3Rpc);

  const chainId = await web3.eth.getChainId();

  // State connector
  const stateConnectorContract = new web3.eth.Contract(StateConnectorAbi.abi as AbiItem[]) as any as StateConnectorTemp;

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

  if (botWallet.address !== botPublicKey) {
    const message = "Private and public key mismatch";
    console.error(message);
    throw new Error(message);
  }

  const constructorData = stateConnectorContract
    .deploy({
      data: StateConnectorAbi.bytecode,
      arguments: [botWallet.address],
    })
    .encodeABI();

  const tx = {
    from: botWallet.address,
    gas: "0x" + web3.utils.toBN(1500000).toString(16),
    gasPrice: "0x" + web3.utils.toBN("30000000000000").toString(16),
    chainId: chainId,
    data: constructorData,
  };

  try {
    const signed = await botWallet.signTransaction(tx);
    const rec = await web3.eth.sendSignedTransaction(signed.rawTransaction);

    console.log(rec);
  } catch (e) {
    console.log("Unsuccessfully round finalization");
    console.log(e);
  }
}

const { argv } = require("yargs").scriptName("airdropTransactions").option("r", {
  alias: "rpc",
  describe: "Rpc url",
  demandOption: "Provide rpc url",
  type: "string",
  nargs: 1,
});

const { rpc } = argv;

deployTempStateConnector(rpc)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
