
// import { HashTestInstance } from "../typechain-truffle";


// describe("HashTest", function () {
//   const HashTest = artifacts.require("HashTest");
//   let hashTest: HashTestInstance;
//   beforeEach(async () => {
//     hashTest = await HashTest.new();
//   });


//   it("Simple test", async function () {
//     let attestationType = 1;
//     let chainId = 2;
//     let blockNumber = 1234567;
//     let blockTimestamp = 1644708699;
//     let blockHash = web3.utils.soliditySha3(blockTimestamp)!;
//     let encoded = web3.eth.abi.encodeParameters(
//       [
//         "uint16", //attestationType;
//         "uint16", //chainId;
//         "uint64", //blockNumber;
//         "uint64", //blockTimestamp;
//         "bytes32" //blockHash;
//       ],
//       [
//         attestationType,
//         chainId,
//         blockNumber,
//         blockTimestamp,
//         blockHash
//       ]
//     );
//     console.log(`${blockTimestamp} - BEFORE`)
//     let hash = web3.utils.soliditySha3(encoded)!;
//     await hashTest.hashTestBlockHeightExistence(encoded, hash)
//   });
// });
