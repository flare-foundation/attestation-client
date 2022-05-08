// Set up COSTON_RPC in .env
// yarn hardhat console --network coston

const StateConnector = artifacts.require("StateConnector");
let stateConnector = await StateConnector.at("0x947c76694491d3fD67a73688003c4d36C8780A97");

async function bufferNumber() {
   let blockNumber = await web3.eth.getBlockNumber();
   let blockTimestamp = (await web3.eth.getBlock(blockNumber)).timestamp;
   let BUFFER_TIMESTAMP_OFFSET = parseInt((await stateConnector.BUFFER_TIMESTAMP_OFFSET()).toString());
   let BUFFER_WINDOW = parseInt((await stateConnector.BUFFER_WINDOW()).toString());
   return Math.floor((blockTimestamp - BUFFER_TIMESTAMP_OFFSET)/BUFFER_WINDOW);
}

var bn = await bufferNumber()
await stateConnector.getAttestation(bn - 2)