import { getUnixEpochTimestamp } from "../lib/utils/utils";
import fetch from 'node-fetch';
import { MerkleTree } from "../lib/utils/MerkleTree";
import { StateConnectorInstance } from "../typechain-truffle";

const axios = require('axios');

describe("Coston verification test", () => {
  let currentBufferNumber = 0;
  let BUFFER_TIMESTAMP_OFFSET: number;
  let BUFFER_WINDOW: number;
  let TOTAL_STORED_PROOFS: number;
  let stateConnector: StateConnectorInstance;

  const StateConnector = artifacts.require("StateConnector");
  before(async () => {
    stateConnector = await StateConnector.at("0x947c76694491d3fD67a73688003c4d36C8780A97");
    BUFFER_TIMESTAMP_OFFSET = (await stateConnector.BUFFER_TIMESTAMP_OFFSET()).toNumber();
    BUFFER_WINDOW = (await stateConnector.BUFFER_WINDOW()).toNumber();
    TOTAL_STORED_PROOFS = (await stateConnector.TOTAL_STORED_PROOFS()).toNumber();
    let now = getUnixEpochTimestamp();
    currentBufferNumber = Math.floor((now - BUFFER_TIMESTAMP_OFFSET)/BUFFER_WINDOW);
    console.log(`Current buffer number ${currentBufferNumber}, mod: ${currentBufferNumber % TOTAL_STORED_PROOFS}`)
  });

  it("Should calculate current buffer number", async () => {
    console.log("HELLO");

    let roundId = (n: number) => (currentBufferNumber - n) % TOTAL_STORED_PROOFS;

    let N = 100;
    const response = await axios.get(`http://34.89.247.51/attester-api/proof/votes-for-round/${roundId(N)}`);
    console.log(response)
    // let data = response.data.data;
    // let hashes: string[] = data.map(item => item.hash) as string[]
    // const tree = new MerkleTree(hashes);
    // console.log(data.length, tree.root);

    // console.log(await stateConnector.merkleRoots(roundId(N)))

    
    
  });


});
