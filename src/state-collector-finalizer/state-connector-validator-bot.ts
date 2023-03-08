import StateConnectorAbi from "../../artifacts/contracts/StateConnectorTemp.sol/StateConnectorTemp.json";
import StateConnectorTranAbi from "../../artifacts/contracts/StateConnectorTempTran.sol/StateConnectorTempTran.json";
import { sleepMs } from "@flarenetwork/mcc";
import { AbiItem } from "web3-utils";

import { getTimeSec } from "../utils/helpers/internetTime";
import { getWeb3 } from "../utils/helpers/web3-utils";
import { StateConnectorTemp } from "../../typechain-web3-v1/StateConnectorTemp";
import { StateConnectorTempTran } from "../../typechain-web3-v1/StateConnectorTempTran";

const ZERO_ROOT = "0x0000000000000000000000000000000000000000000000000000000000000000";
const DEFAULT_GAS = "2500000";
const DEFAULT_GAS_PRICE = "300000000000";
const ATTESTATION_CLIENT_SIGNERS = {
  // Flare
  14: [
    "0x0988Cf4828F4e4eD0cE7c07467E70e19095Ee152",
    "0x6BC7DCa62010D418eB72CCdc58561e00C5868Ef1",
    "0xE34Bb361536610a9DCcEa5292262e36AfF65c06c",
    "0x8A3D627D86A81F5D21683F4963565C63DB5e1309",
    "0x2D3e7e4b19bDc920fd9C57BD3072A31F5a59FeC8",
    "0x6455dC38fdF739b6fE021b30C7D9672C1c6DEb5c",
    "0x49893c5Dfc035F4eE4E46faC014f6D4bC80F7f92",
    "0x08e8b2Af4874e920de27723576A13d66008Af523",
    "0x5D2f75392DdDa69a2818021dd6a64937904c8352",
  ],
  // coston 2 from chain
  114_1: [
    "0x30e4b4542b4aAf615838B113f14c46dE1469212e",
    "0x3519E14183252794aaA52aA824f34482ef44cE1d",
    "0xb445857476181ec378Ec453ab3d122183CfC3b78",
    "0x6D755cd7A61A9DCFc96FaE0f927C3a73bE986ce4",
    "0xdC0fD24846303D58d2D66AA8820be2685735dBd2",
    "0x3F52c41c0500a4f018A38c9f8273b254aD7e2FCc",
    "0xdA6d6aA9F1f770c279c5DA0C71f4DC1142A70d5D",
    "0x3d895D00d2802120D39d4D2554F7ef09d6845E99",
    "0xc36141CFBe5Af6eB2F8b21550Ccd457DA7FaF3C6",
  ],
  // coston 2 // Luka generated
  114: [
    "0xB4C7C4Dcf2F7F49A449863C46579537AD462BF30", // privateKey: '0x2b5c11199df84a53b9a56abc6065b0f94e94e551e6e6c4f33db5662af1b1836f'
    "0x7705F9047b439F3531D7F5FFE04687915fE05442", // privateKey: '0xb50a5ae7f216f337c8f679a66385db1975f4560429f46cd593ad4ee7f5e6b42d'
    "0x095a7bc2Aac0b057f1e498727c6E43469119559A", // privateKey: '0x74453ae0d95d1efd91751c301c8b61f2e8d36b3de4414436836654a90526774e'
    "0xb411297405A1ED9DAB180601f6fC11eb22F531a1", // privateKey: '0x6f7555da9a3301063fa8291a4221385273cc1d8a50b19dcb9bf58d03b90396cd'
    "0xaB2c7794FB4bb8CAE03574115597b90b6F1E69D7", // privateKey: '0x297e04fa01f4133fc4ff26b3a6ae2dedf18349cc1988e0a6cad72c36e0083e58'
    "0xc44caA92f4F0316ceF5685Bb79757A06dD022Db4", // privateKey: '0x31cc19964ce4daa534ee7d7941ef3981f95fc25b46ac77a64e8e17f7cac4aa63'
    "0xe4b272B604ef9ccF7B5D0A4905c495453556db39", // privateKey: '0x8b9cba862578be518ea32078ab55ce23879b17aa6ca9876b7f38432ca320f787'
    "0x426762dF6989FF76d5e20Df0B8BFe3F608A2C800", // privateKey: '0x17c01bfac6d939238a1eb9284e7779ac5d28afaed2dd1fc6db34f9051fcd0698'
    "0xE0A7f3ceF1D4773fBF060A7d2443e9e6c08d2C46", // privateKey: '0x986b18fbe5ee3bc9ce91e5845e8b0cfc8f863a8844e546ce430a08e76c5c9f65'
  ],
  // songbird
  19: ["0x0c19f3B4927abFc596353B0f9Ddad5D817736F70"],
  // coston
  16: [
    "0x0988Cf4828F4e4eD0cE7c07467E70e19095Ee152",
    "0x6BC7DCa62010D418eB72CCdc58561e00C5868Ef1",
    "0xE34Bb361536610a9DCcEa5292262e36AfF65c06c",
    "0x8A3D627D86A81F5D21683F4963565C63DB5e1309",
    "0x2D3e7e4b19bDc920fd9C57BD3072A31F5a59FeC8",
    "0x6455dC38fdF739b6fE021b30C7D9672C1c6DEb5c",
    "0x49893c5Dfc035F4eE4E46faC014f6D4bC80F7f92",
    "0x08e8b2Af4874e920de27723576A13d66008Af523",
    "0x5D2f75392DdDa69a2818021dd6a64937904c8352",
  ],
  0: [
    "0x8db97C7cEcE249c2b98bDC0226Cc4C2A57BF52FC", // Private key: 56289e99c94b6912bfc12adc093c9b51124f0dc54ac7a766b2bc5ccf558d8027
  ],
};

function getAttestationSigners(chainId: number): string[] {
  switch (chainId) {
    // Flare
    case 14:
      return ATTESTATION_CLIENT_SIGNERS[14];
    case 114:
      return ATTESTATION_CLIENT_SIGNERS[114];
    case 19:
      return ATTESTATION_CLIENT_SIGNERS[19];
    case 16:
      return ATTESTATION_CLIENT_SIGNERS[16];
    case 31337:
      return process.env.TEST_CUSTOM_SIGNERS ? JSON.parse(process.env.TEST_CUSTOM_SIGNERS) : [];
    default:
      return ATTESTATION_CLIENT_SIGNERS[0];
  }
}

export async function runBot(SCAddress: string, web3Rpc: string, flavor: "temp" | "tran") {
  const web3 = getWeb3(web3Rpc);

  if (process.env.TEST_HARDHAT_NODE) {
    // Due to bug in combination with Ganache: https://github.com/web3/web3.js/issues/3742
    web3.eth.handleRevert = false;
  }

  function toBN(inp: string | number) {
    return web3.utils.toBN(inp);
  }

  const chainId = await web3.eth.getChainId();
  const signers = getAttestationSigners(chainId);
  const voteThreshold = Math.ceil(signers.length / 2);

  // State connector
  const AbiItemForDeploy = flavor === "tran" ? StateConnectorTranAbi : StateConnectorAbi;

  let stateConnectorContract: StateConnectorTemp | StateConnectorTempTran =
    flavor === "tran"
      ? (new web3.eth.Contract(AbiItemForDeploy.abi as AbiItem[], SCAddress) as any as StateConnectorTemp)
      : (new web3.eth.Contract(AbiItemForDeploy.abi as AbiItem[], SCAddress) as any as StateConnectorTempTran);

  const BUFFER_WINDOW = toBN(await stateConnectorContract.methods.BUFFER_WINDOW().call());
  const BUFFER_TIMESTAMP_OFFSET = toBN(await stateConnectorContract.methods.BUFFER_TIMESTAMP_OFFSET().call());

  // Function to calculate round start time using constant values
  function getRoundStartTime(roundId: number) {
    return BUFFER_WINDOW.muln(roundId).add(BUFFER_TIMESTAMP_OFFSET);
  }

  function tsToRoundId(ts: number) {
    return toBN(ts).sub(BUFFER_TIMESTAMP_OFFSET).div(BUFFER_WINDOW);
  }

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

  let latestFinalizedRound = 0;

  while (true) {
    const now = getTimeSec();
    const currentRound = tsToRoundId(now).toNumber();
    // Bot already finalized the specific round
    if (latestFinalizedRound >= currentRound) {
      const nextRoundStart = getRoundStartTime(currentRound + 1).toNumber();
      // Sleep until next round starts
      await sleepMs((nextRoundStart - now) * 1000);
      continue;
    }

    // We need to finalize the round
    let merkleRootCandidates = [];

    async function getAttestation(currentRound: number, signer: string) {
      try {
        let result = await stateConnectorContract.methods.getAttestation(currentRound, signer).call();
        return result;
      } catch (e) {
        // console.log(`Signer: ${signer} has no attestation`);
        return ZERO_ROOT;
      }
    }

    console.log("VOTES:");
    for (const signer of signers) {
      let result = await getAttestation(currentRound, signer);
      console.error(`[${currentRound}]${signer}: ${result}`);
      merkleRootCandidates.push(result);
    }

    const counter = {};
    for (const finalized of merkleRootCandidates as string[]) {
      if (finalized in counter) {
        counter[finalized] += 1;
      } else {
        counter[finalized] = 0;
      }
    }

    let root = ZERO_ROOT;

    for (const [key, value] of Object.entries(counter)) {
      if (value >= voteThreshold) {
        root = key;
      }
    }

    let tmpBlockNumber = await web3.eth.getBlockNumber();
    let tmpBlock = await web3.eth.getBlock(tmpBlockNumber);

    console.log(
      `BEFORE SENDING: currentRound: ${currentRound}, shouldBeForNow: ${Math.floor(
        (now - BUFFER_TIMESTAMP_OFFSET.toNumber()) / BUFFER_WINDOW.toNumber()
      )}, fromBlockTime: ${Math.floor((parseInt("" + tmpBlock.timestamp, 10) - BUFFER_TIMESTAMP_OFFSET.toNumber()) / BUFFER_WINDOW.toNumber())}`
    );
    const finalizeData = stateConnectorContract.methods.finaliseRound(currentRound, root).encodeABI();
    const tx = {
      from: botWallet.address,
      to: SCAddress,
      gas: "0x" + toBN(DEFAULT_GAS).toString(16),
      gasPrice: "0x" + toBN(DEFAULT_GAS_PRICE).toString(16),
      chainId: chainId,
      data: finalizeData,
    };

    try {
      const signed = await botWallet.signTransaction(tx);
      const rec = await web3.eth.sendSignedTransaction(signed.rawTransaction);
    } catch (e) {
      console.log("Unsuccessful round finalization");
      console.log(e);
    }

    // Round was finalized
    latestFinalizedRound = currentRound;

    // Log that it was successfully finalized
    console.log(`Round: ${currentRound} : ${root}`);
  }
}
