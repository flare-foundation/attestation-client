// yarn c
// yarn hardhat test test/CommitTest.test.ts 

import { prefix0x, toBN, unPrefix0x } from "flare-mcc";
import { singleHash } from "../lib/utils/MerkleTree";
import { CommitTestInstance } from "../typechain-truffle";

const BN = require("bn");

function xor32(hex1: string, hex2: string) {
  let h1 = unPrefix0x(hex1);
  let h2 = unPrefix0x(hex2);
  if (!(/^[a-fA-F0-9]{64}$/.test(h1) && /^[a-fA-F0-9]{64}$/.test(h2))) {
    throw new Error("Incorrectly formatted 32-byte strings");
  }
  const buf1 = Buffer.from(h1, 'hex');
  const buf2 = Buffer.from(h2, 'hex');
  const bufResult = buf1.map((b, i) => b ^ buf2[i]);
  return prefix0x(Buffer.from(bufResult).toString('hex'));
}

describe("Coston verification test", () => {

  const CommitTest = artifacts.require("CommitTest");
  let commitTest: CommitTestInstance;

  before(async () => {
    commitTest = await CommitTest.new();
  });

  // it("xor check", async () => {
  //   let merkleRoot = "0xe84423e6626d616f4fa7b795563732f402932ce21039f0125d3cd71372a6d3b1";
  //   let maskedMerkleRoot = "0x7eecfdea4bdce2b1230c4d3d0f4d41ae9657be4bb3094bcfb74b197545918ae";
  //   let revealedRandom = "0xefaaec38c6d0af445d97734686c3e6eeebf65706ab0964aea648668426ffcb1f"

  //   let result = xor()
  // });

  // 2022-03-30T11:02:50.002Z  - global:[debug]: commit data prepared: roundId=139640 merkleTree.root=0x1e5862543fe722cd647c30896f35dc1b91863608db8e6515280aa2df20c39dbf hash=0xd48a5e273a02f926559c9de876d29b210ae1e3d78f02dbbb0
  // 9f88050edaad004
  // 2022-03-30T11:02:50.003Z  - global:[info]: action ............. : Submitting for bufferNumber 139641 (start commit for 139640)
  // 2022-03-30T11:02:50.003Z  - global:[info]: bufferNumber ....... : 139641
  // 2022-03-30T11:02:50.004Z  - global:[info]: maskedMerkleHash ... : 0xcad23c7305e5dbeb31e0ad6119e7473a9b67d5df548cbeae21f2228fcd694dbb
  // 2022-03-30T11:02:50.004Z  - global:[info]: committedRandom .... : 0xfece3f631b8ed6c257b97573d10b860a416e8a27a12e969332921585a02e3e44
  // 2022-03-30T11:02:50.005Z  - global:[info]: revealedRandom ..... : 0xe4f3f3811ed35d37e79ba7c9ed2efde57fc868028ce9fe6aee66be5ffdf86545


  it("Should check the commit for buffer 139641", async () => {

    let merkleRoot = "0x1e5862543fe722cd647c30896f35dc1b91863608db8e6515280aa2df20c39dbf";
    let maskedMerkleRoot = "0xcad23c7305e5dbeb31e0ad6119e7473a9b67d5df548cbeae21f2228fcd694dbb";
    let committedRandom = "0xfece3f631b8ed6c257b97573d10b860a416e8a27a12e969332921585a02e3e44"
    let revealedRandom = "0xd48a5e273a02f926559c9de876d29b210ae1e3d78f02dbbb09f88050edaad004"
    let result = await commitTest.test(merkleRoot, maskedMerkleRoot, committedRandom, revealedRandom);
    console.log(result);
    assert(result === merkleRoot);
  });



  // 2022-03-30T11:04:20.003Z  - global:[debug]: commit data prepared: roundId=139641 merkleTree.root=0xe84423e6626d616f4fa7b795563732f402932ce21039f0125d3cd71372a6d3b1 hash=0xefaaec38c6d0af445d97734686c3e6eeebf65706ab0964aea
  // 648668426ffcb1f
  // 2022-03-30T11:04:20.003Z  - global:[info]: action ............. : Submitting for bufferNumber 139642 (start commit for 139641)
  // 2022-03-30T11:04:20.004Z  - global:[info]: bufferNumber ....... : 139642
  // 2022-03-30T11:04:20.004Z  - global:[info]: maskedMerkleHash ... : 0x7eecfdea4bdce2b1230c4d3d0f4d41ae9657be4bb3094bcfb74b197545918ae
  // 2022-03-30T11:04:20.005Z  - global:[info]: committedRandom .... : 0x7454c2f7a8f586291c23cd1b87a0e8940256821935b5c3928d5acd8112714e2a
  // 2022-03-30T11:04:20.005Z  - global:[info]: revealedRandom ..... : 0xd48a5e273a02f926559c9de876d29b210ae1e3d78f02dbbb09f88050edaad004
  // 2022-03-30T11:04:20.005Z  - global:[debug]: sign Submitting for bufferNumber 139642 (start commit for 139641) wait #67/60
  // 2022-03-30T11:04:20.535Z  - global:[debug]: new block 435814 with 1 event(s)
  // 2022-03-30T11:04:20.536Z  - global:[error]: EVENT RoundFinalised 139642 0x2d8254a033d68c532e3410ac79a09d262fd27be1980b67b33c9451f9e20c044e (commited root 0xefbb53a202d2321b65a5f80909b9731865d2449a98162d2f1d75f05a59317f74)

  it("bytes32 test", async () => {
    console.log(await commitTest.test2("0x012345"));
  });

  it("BN XOR TEST", async () => {
    //                  123456789 123456789 123456789 123456789 123456789 123456789 1234
    let merkleRoot =      "0xe84423e6626d616f4fa7b795563732f402932ce21039f0125d3cd71372a6d3b1";
    let maskedMerkleRoot ="0x07eecfdea4bdce2b1230c4d3d0f4d41ae9657be4bb3094bcfb74b197545918ae";
    let revealedRandom =  "0xefaaec38c6d0af445d97734686c3e6eeebf65706ab0964aea648668426ffcb1f"

    let merkleRootBN2 = new BN.BigInteger(merkleRoot);

    let merkleRootBN = toBN(merkleRoot);
    let maskedMerkleRootBN = toBN(maskedMerkleRoot);
    let randomBN = toBN(revealedRandom);


    let testA = merkleRootBN.xor(randomBN);
    let testB = maskedMerkleRootBN.xor(randomBN);
    let testC = xor32(merkleRoot, revealedRandom);
    let testD = xor32(maskedMerkleRoot, revealedRandom)

    const testAStr = testA.toString(16);
    const testBStr = testB.toString(16);


    let test1 = merkleRootBN.xor(randomBN).xor(randomBN);

    const randomStr = randomBN.toString(16);
    const merkleRootStr = merkleRootBN.toString(16);
    const merkleRoot2Str = merkleRootBN2.toString(16);
    const maskedMerkleRootStr = maskedMerkleRootBN.toString(16);
    const test1Str = test1.toString(16);


    console.log("random           = ", randomStr);
    console.log("merkleRoot       = ", merkleRootStr);
    console.log("merkleRoot2      = ", merkleRoot2Str);
    console.log("maskedMerkleRoot = ", maskedMerkleRootStr);
    console.log("test1            = ", test1Str);
    console.log("testA            = ", testAStr);
    console.log("testB            = ", testBStr);
    console.log("testC            = ", testC);
    console.log("testD            = ", testD);


    assert(test1Str === merkleRootStr);
    assert(testAStr === maskedMerkleRootStr);
    assert(testBStr === merkleRootStr);
  });

  it("BN XOR TEST", async () => {
    //                  123456789 123456789 123456789 123456789 123456789 123456789 1234
    let merkleRoot = "0x39b9cb7fd4bd42ced11a83fa09f1a6ebe7d05e53d35e470e19bd0bb1a7328b7d";
    let maskedMerkleRoot = "0x81719674e8fb475ed01f42a8699261e8e11270c628a458960dc3abde0eb4fb38";
    let committedRandom = "0x345842159fa1a9a788ddcfb7565074e2dc72271f3e568ac22d096a2e4de38558"
    let revealedRandom = "0xb8c85d0b3c4605900105c1526063c70306c22e95fbfa1f98147ea06fa9867045"

    let merkleRootBN = toBN(merkleRoot);
    let maskedMerkleRootBN = toBN(maskedMerkleRoot);
    let randomBN = toBN(revealedRandom);


    let testA = merkleRootBN.xor(randomBN);
    let testB = maskedMerkleRootBN.xor(randomBN);

    const testAStr = testA.toString(16);
    const testBStr = testB.toString(16);


    let test1 = merkleRootBN.xor(randomBN).xor(randomBN);

    const randomStr = randomBN.toString(16);
    const merkleRootStr = merkleRootBN.toString(16);
    const maskedMerkleRootStr = maskedMerkleRootBN.toString(16);
    const test1Str = test1.toString(16);


    console.log("random           = ", randomStr);
    console.log("merkleRoot       = ", merkleRootStr);
    console.log("maskedMerkleRoot = ", maskedMerkleRootStr);
    console.log("test1            = ", test1Str);
    console.log("testA            = ", testAStr);
    console.log("testB            = ", testBStr);

    assert(test1Str === merkleRootStr);
    assert(testAStr === maskedMerkleRootStr);
    assert(testBStr === merkleRootStr);
  });


  it("Should check the commit for buffer 139642", async () => {

    let merkleRoot = "0xe84423e6626d616f4fa7b795563732f402932ce21039f0125d3cd71372a6d3b1";
    let maskedMerkleRoot = "0x7eecfdea4bdce2b1230c4d3d0f4d41ae9657be4bb3094bcfb74b197545918ae";
    let committedRandom = "0x7454c2f7a8f586291c23cd1b87a0e8940256821935b5c3928d5acd8112714e2a"
    let revealedRandom = "0xefaaec38c6d0af445d97734686c3e6eeebf65706ab0964aea648668426ffcb1f"
    let result = await commitTest.test(merkleRoot, maskedMerkleRoot, committedRandom, revealedRandom);


    // maskedMerkleRoot2: 0x7eecfdea4bdce2b1230c4d3d0f4d41ae9657be4bb3094bcfb74b197545918ae
    // merkleRoot2: 0x23f84423e6626d616f4fa7b795563732f402932ce21039f0125d3cd71372a6d3b1
    // committedRandom2: 0x7454c2f7a8f586291c23cd1b87a0e8940256821935b5c3928d5acd8112714e2a
    // Unmasked contract 0x914611d28d0c4df57e9b3e7b898ea7407da1e94d18002f6111037ff1636e41ff

    let merkleRootBN = new BN.BigInteger(merkleRoot, 16);
    let randomBN = new BN.BigInteger(revealedRandom, 16);
    let maskedMerkleRootBN = new BN.BigInteger(maskedMerkleRoot, 16);
    let maskedMerkleRoot2 = '0x' + merkleRootBN.xor(randomBN).toString(16);
    let merkleRoot2 = '0x' + maskedMerkleRootBN.xor(randomBN).toString(16);
    let committedRandom2 = singleHash(revealedRandom);

    console.log("maskedMerkleRoot2:", maskedMerkleRoot2);
    console.log("merkleRoot2:", merkleRoot2);
    console.log("committedRandom2:", committedRandom2);
    console.log("Unmasked contract", result);
    assert(result === merkleRoot);
  });

  // 2022-03-30T11:05:50.002Z  - global:[debug]: commit data prepared: roundId=139642 merkleTree.root=0x39b9cb7fd4bd42ced11a83fa09f1a6ebe7d05e53d35e470e19bd0bb1a7328b7d hash=0xb8c85d0b3c4605900105c1526063c70306c22e95fbfa1f98147ea06fa9867045
  // 2022-03-30T11:05:50.002Z  - global:[info]: action ............. : Submitting for bufferNumber 139643 (start commit for 139642)
  // 2022-03-30T11:05:50.004Z  - global:[info]: bufferNumber ....... : 139643
  // 2022-03-30T11:05:50.004Z  - global:[info]: maskedMerkleHash ... : 0x81719674e8fb475ed01f42a8699261e8e11270c628a458960dc3abde0eb4fb38
  // 2022-03-30T11:05:50.004Z  - global:[info]: committedRandom .... : 0x345842159fa1a9a788ddcfb7565074e2dc72271f3e568ac22d096a2e4de38558
  // 2022-03-30T11:05:50.004Z  - global:[info]: revealedRandom ..... : 0xefaaec38c6d0af445d97734686c3e6eeebf65706ab0964aea648668426ffcb1f
  // 2022-03-30T11:05:50.004Z  - global:[debug]: sign Submitting for bufferNumber 139643 (start commit for 139642) wait #68/60
  // 2022-03-30T11:05:50.578Z  - global:[debug]: new block 435881 with 1 event(s)
  // 2022-03-30T11:05:50.579Z  - global:[error]: EVENT RoundFinalised 139643 0x2b047807bde298064971e118794219d874451b9f2af7db5745717abfbfc629a3 (commited root 0x1e5862543fe722cd647c30896f35dc1b91863608db8e6515280aa2df20c39dbf)

  it("Should check the commit for buffer 139643", async () => {

    let merkleRoot = "0x39b9cb7fd4bd42ced11a83fa09f1a6ebe7d05e53d35e470e19bd0bb1a7328b7d";
    let maskedMerkleRoot = "0x81719674e8fb475ed01f42a8699261e8e11270c628a458960dc3abde0eb4fb38";
    let committedRandom = "0x345842159fa1a9a788ddcfb7565074e2dc72271f3e568ac22d096a2e4de38558"
    let revealedRandom = "0xb8c85d0b3c4605900105c1526063c70306c22e95fbfa1f98147ea06fa9867045"

    console.log("oms", maskedMerkleRoot)
    console.log("mas", xor32(merkleRoot, revealedRandom))
    console.log("mx2", xor32(xor32(merkleRoot, revealedRandom), revealedRandom))
    console.log("   ", merkleRoot);

    let result = await commitTest.test(merkleRoot, maskedMerkleRoot, committedRandom, revealedRandom);
    console.log(result);
    assert(result === merkleRoot);

  });

  // 2022-03-30T11:07:20.001Z  - global:[debug]: commit data prepared: roundId=139643 merkleTree.root=0xc0785441d5342e357a8a9d7c6728315c197e84d3405b8eeb8426d1dda55beb6a hash=0xd1574d705e00e796726010d1db5aa7474bdf7d8dc95cf2cb20f3c1d1c9094808
  // 2022-03-30T11:07:20.002Z  - global:[info]: action ............. : Submitting for bufferNumber 139644 (start commit for 139643)
  // 2022-03-30T11:07:20.002Z  - global:[info]: bufferNumber ....... : 139644
  // 2022-03-30T11:07:20.002Z  - global:[info]: maskedMerkleHash ... : 0x112f19318b34c9a308ea8dadbc72961b52a1f95e89077c20a4d5100c6c52a362
  // 2022-03-30T11:07:20.002Z  - global:[info]: committedRandom .... : 0x81aa36625ae4efa78069fcecff9dfc7e081a51795d2edd2960511fcf380386e2
  // 2022-03-30T11:07:20.002Z  - global:[info]: revealedRandom ..... : 0xb8c85d0b3c4605900105c1526063c70306c22e95fbfa1f98147ea06fa9867045

  it("Should check the commit for buffer 139644", async () => {
    let commitTest = await CommitTest.new();
    let merkleRoot = "0xc0785441d5342e357a8a9d7c6728315c197e84d3405b8eeb8426d1dda55beb6a";
    let maskedMerkleRoot = "0x112f19318b34c9a308ea8dadbc72961b52a1f95e89077c20a4d5100c6c52a362";
    let committedRandom = "0x81aa36625ae4efa78069fcecff9dfc7e081a51795d2edd2960511fcf380386e2"
    let revealedRandom = "0xd1574d705e00e796726010d1db5aa7474bdf7d8dc95cf2cb20f3c1d1c9094808"
    let result = await commitTest.test(merkleRoot, maskedMerkleRoot, committedRandom, revealedRandom);
    console.log(result);
    assert(result === merkleRoot);

  });



  // 2022-03-30T11:08:50.003Z  - global:[debug]: commit data prepared: roundId=139644 merkleTree.root=0xc466aa49340437cd911475e4f29ad90f6e51b396d88bf5f77930aa94fa25d662 hash=0x8887d5644e6769138090ffd0678b5a08474d33d4bcbfab5a59cdb52d3ab820b3
  // 2022-03-30T11:08:50.003Z  - global:[info]: action ............. : Submitting for bufferNumber 139645 (start commit for 139644)
  // 2022-03-30T11:08:50.003Z  - global:[info]: bufferNumber ....... : 139645
  // 2022-03-30T11:08:50.003Z  - global:[info]: maskedMerkleHash ... : 0x4ce17f2d7a635ede11848a3495118307291c804264345ead20fd1fb9c09df6d1
  // 2022-03-30T11:08:50.004Z  - global:[info]: committedRandom .... : 0x4f9b422ff1cd3d60279525cb10e0dcc5ce0994a0373547919ed6c4a8251eda99
  // 2022-03-30T11:08:50.004Z  - global:[info]: revealedRandom ..... : 0xd1574d705e00e796726010d1db5aa7474bdf7d8dc95cf2cb20f3c1d1c9094808

  it("Should check the commit for buffer 139645", async () => {
    let commitTest = await CommitTest.new();
    let merkleRoot = "0xc466aa49340437cd911475e4f29ad90f6e51b396d88bf5f77930aa94fa25d662";
    let maskedMerkleRoot = "0x4ce17f2d7a635ede11848a3495118307291c804264345ead20fd1fb9c09df6d1";
    let committedRandom = "0x4f9b422ff1cd3d60279525cb10e0dcc5ce0994a0373547919ed6c4a8251eda99"
    let revealedRandom = "0x8887d5644e6769138090ffd0678b5a08474d33d4bcbfab5a59cdb52d3ab820b3"
    let result = await commitTest.test(merkleRoot, maskedMerkleRoot, committedRandom, revealedRandom);
    console.log(result);
    assert(result === merkleRoot);

  });

  // 2022-03-30T11:10:20.001Z  - global:[debug]: commit data prepared: roundId=139645 merkleTree.root=0x709a8870630096effc0d8cc66ad6b4c246bdba493dcf290290be9ca9f5d7516c hash=0xa3c98ff4823d0f56ebb8ec015e0d42493b0d663c2914fca8527c4e2c10aacd0c
  // 2022-03-30T11:10:20.001Z  - global:[info]: action ............. : Submitting for bufferNumber 139646 (start commit for 139645)
  // 2022-03-30T11:10:20.002Z  - global:[info]: bufferNumber ....... : 139646
  // 2022-03-30T11:10:20.002Z  - global:[info]: maskedMerkleHash ... : 0xd3530784e13d99b917b560c734dbf68b7db0dc7514dbd5aac2c2d285e57d9c60
  // 2022-03-30T11:10:20.002Z  - global:[info]: committedRandom .... : 0x035504e3fe28dc9cd500653b935ff9d0aabe584e95e9ef499ae7a2f421fa4485
  // 2022-03-30T11:10:20.002Z  - global:[info]: revealedRandom ..... : 0x8887d5644e6769138090ffd0678b5a08474d33d4bcbfab5a59cdb52d3ab820b3


  // --------------


  // 2022-03-30T11:50:50.002Z  - global:[debug]: commit data prepared: roundId=139672 merkleTree.root=0x732697f522b6a189ebd0ff65ed66840f0c8823f6acb7e44da2aecc28e9d28a30 hash=0xcfde33daab7747de161366cb5fffd9817d1ccdf1be46fba820873fc7eaab14d1
  // 2022-03-30T11:50:50.002Z  - global:[info]: action ............. : Submitting for bufferNumber 139673 (start commit for 139672)
  // 2022-03-30T11:50:50.003Z  - global:[info]: bufferNumber ....... : 139673
  // 2022-03-30T11:50:50.003Z  - global:[info]: maskedMerkleHash ... : 0xbcf8a42f89c1e657fdc399aeb2995d8e7194ee0712f11fe58229f3ef03799ee1
  // 2022-03-30T11:50:50.003Z  - global:[info]: committedRandom .... : 0x7c13c3f9d06f77a9133ffc305a5f56126b6a14312d515a39b09a07d0746a5081
  // 2022-03-30T11:50:50.003Z  - global:[info]: revealedRandom ..... : 0xfa94dc211078e549b0ca906477c01b2782c29e85e45aeb39d935c27e78a4ac23
  // 2022-03-30T11:50:51.184Z  - global:[error]: EVENT RoundFinalised 139673 0xe96be06303eb1c54f252a39791f3b9facedc3f6b89e3858c4b561ec8710a222e (commited root 0x5d96b32998c743d3173311cf8b997c00735536b0d0da629773186d48e977ae18
  //   )  

  it("Should check the commit for buffer 139673", async () => {

    let merkleRoot = "0x732697f522b6a189ebd0ff65ed66840f0c8823f6acb7e44da2aecc28e9d28a30";
    let maskedMerkleRoot = "0xbcf8a42f89c1e657fdc399aeb2995d8e7194ee0712f11fe58229f3ef03799ee1";
    let committedRandom = "0x7c13c3f9d06f77a9133ffc305a5f56126b6a14312d515a39b09a07d0746a5081"
    let revealedRandom = "0xcfde33daab7747de161366cb5fffd9817d1ccdf1be46fba820873fc7eaab14d1"
    let result = await commitTest.test(merkleRoot, maskedMerkleRoot, committedRandom, revealedRandom);
    console.log(result);
    assert(result === merkleRoot);
  });

  //   2022-03-30T11:52:20.001Z  - global:[debug]: commit data prepared: roundId=139673 merkleTree.root=0x8d6b827eae831197dc4e560b39b83ec57ce6a4b00f1bebbfade8354fb2d47e0e hash=0x4accbd736cbf35ecdd5c54544b32b76c0630411f1a337938b2eed3b55c1a90a6
  // 2022-03-30T11:52:20.002Z  - global:[info]: action ............. : Submitting for bufferNumber 139674 (start commit for 139673)
  // 2022-03-30T11:52:20.002Z  - global:[info]: bufferNumber ....... : 139674
  // 2022-03-30T11:52:20.003Z  - global:[info]: maskedMerkleHash ... : 0xc7a73f0dc23c247b0112025f728a89a97ad6e5af152892871f06e6faeeceeea8
  // 2022-03-30T11:52:20.003Z  - global:[info]: committedRandom .... : 0x7a28bf6657fb52d3510e4e7cfc8295b6eacfb5c4d13c20fd48b26e709121e0c9
  // 2022-03-30T11:52:20.004Z  - global:[info]: revealedRandom ..... : 0xcfde33daab7747de161366cb5fffd9817d1ccdf1be46fba820873fc7eaab14d1
  // });
  // 2022-03-30T11:52:20.512Z  - global:[error]: EVENT RoundFinalised 139674 0xd1c21bda913c280b440398fe3e8d25399cf9121006ddfd7882d211d7346a86ca (commited root 0xf6d1cfb26536536a133369b8a5c8e1e9adde7b863e2b790858a83d344852aca3)

  it("Should check the commit for buffer 139674", async () => {

    let merkleRoot = "0x8d6b827eae831197dc4e560b39b83ec57ce6a4b00f1bebbfade8354fb2d47e0e";
    let maskedMerkleRoot = "0xc7a73f0dc23c247b0112025f728a89a97ad6e5af152892871f06e6faeeceeea8";
    let committedRandom = "0x7a28bf6657fb52d3510e4e7cfc8295b6eacfb5c4d13c20fd48b26e709121e0c9"
    let revealedRandom = "0x4accbd736cbf35ecdd5c54544b32b76c0630411f1a337938b2eed3b55c1a90a6"
    let result = await commitTest.test(merkleRoot, maskedMerkleRoot, committedRandom, revealedRandom);
    console.log(result);
    assert(result === merkleRoot);
  });

  // 2022-03-30T11:53:50.002Z  - global:[debug]: commit data prepared: roundId=139674 merkleTree.root=0x165829343d00f97d2094be72e1fd69e6cea6efbf28ad14e5854d2a11e1bae5ed hash=0x59573f164ab6387728b1fb1a3e5fb020eaf481fd477dc92c016b554ade6a9fe6
  // 2022-03-30T11:53:50.002Z  - global:[info]: action ............. : Submitting for bufferNumber 139675 (start commit for 139674)
  // 2022-03-30T11:53:50.003Z  - global:[info]: bufferNumber ....... : 139675
  // 2022-03-30T11:53:50.003Z  - global:[info]: maskedMerkleHash ... : 0x4f0f162277b6c10a08254568dfa2d9c624526e426fd0ddc984267f5b3fd07a0b
  // 2022-03-30T11:53:50.003Z  - global:[info]: committedRandom .... : 0x79d26416aa92e4feeaf5e0722ed9f0197bc5d84459d5d4353043dd0e1eb564fc
  // 2022-03-30T11:53:50.003Z  - global:[info]: revealedRandom ..... : 0x4accbd736cbf35ecdd5c54544b32b76c0630411f1a337938b2eed3b55c1a90a6
  // 2022-03-30T11:53:50.003Z  - global:[debug]: sign Submitting for bufferNumber 139675 (start commit for 139674) wait #100/96
  // 2022-03-30T11:53:50.332Z  - global:[debug]: new block 438077 with 1 event(s)
  // 2022-03-30T11:53:51.219Z  - global:[debug]: new block 438078 with 1 event(s)
  // 2022-03-30T11:53:51.220Z  - global:[error]: EVENT RoundFinalised 139675 0x8cc209751dc1b01779b09d95345505ed9b07bef189711c88c9fba3a39f2e990e (commited root 0x732697f522b6a189ebd0ff65ed66840f0c8823f6acb7e44da2aecc28e9d28a30)


  //=======================================

  // 2022-03-30T15:56:50.000Z  - global:[info]: #139836: canCommit: processed: 27, all: 27, status: 1
  // 2022-03-30T15:56:50.001Z  - global:[debug]: commit data prepared: roundId=139836 merkleTree.root=0x82e53163698555df7ddd54a0d176130d4a8add7237f4c43068e59b2e14e98831 random=0xe200f7f748261c280454556cc205f1eacc21cd7a96e0c83854947c3cda74382c
  // 2022-03-30T15:56:50.001Z  - global:[info]: action ............. : Submitting for bufferNumber 139837 (start commit for 139836)
  // 2022-03-30T15:56:50.001Z  - global:[info]: bufferNumber ....... : 139837
  // 2022-03-30T15:56:50.001Z  - global:[info]: maskedMerkleHash ... : 0x60e5c69421a349f7798901cc1373e2e786ab1008a1140c083c71e712ce9db01d
  // 2022-03-30T15:56:50.001Z  - global:[info]: committedRandom .... : 0xeadc3c05fbbe92a47e8c533b650c5e6543a1fb233f4c96efb86105a4891c136d
  // 2022-03-30T15:56:50.001Z  - global:[info]: revealedRandom ..... : 0x1dc1864e23ea93477fb0e387ca2c76acbafb7954f6d2455ae7fdd96a2147a211
  // 2022-03-30T15:56:50.001Z  - global:[info]: sign Submitting for bufferNumber 139837 (start commit for 139836) start #11
  // 2022-03-30T15:56:50.192Z  - global:[debug]: new block 446653 with 1 event(s)
  // 2022-03-30T15:56:50.513Z  - global:[debug]: new block 446654 with 1 event(s)
  // 2022-03-30T15:56:50.514Z  - global:[error]: EVENT RoundFinalised 139837 0x2aff8f7dfb0797e49ab35d841fbf72eebdbbd2db7fbfc964320530ce30598f25 (commited root 0x556825785aced354b94a047685ea1773c35be43fb6bda83f246b4b6d7e767701)
  

  it.only("Should check the commit for buffer 139837", async () => {

    let merkleRoot = "0x82e53163698555df7ddd54a0d176130d4a8add7237f4c43068e59b2e14e98831";
    let maskedMerkleRoot = "0x60e5c69421a349f7798901cc1373e2e786ab1008a1140c083c71e712ce9db01d";
    let committedRandom = "0xeadc3c05fbbe92a47e8c533b650c5e6543a1fb233f4c96efb86105a4891c136d"
    let revealedRandom = "0xe200f7f748261c280454556cc205f1eacc21cd7a96e0c83854947c3cda74382c"

    let result = await commitTest.test(merkleRoot, maskedMerkleRoot, committedRandom, revealedRandom);
    console.log(result);
    assert(result === merkleRoot);
  });



  // 2022-03-30T15:58:20.001Z  - global:[debug]: commit data prepared: roundId=139837 merkleTree.root=0x55cc2b4d4715b309c67f28cedc417c4ae9a8cd74e0585cc7860e677dd556aff6 random=0xcfc876581e9942776008c084cd6652b20c76f8c598e7d2441e4f55b4e4f30f7d
  // 2022-03-30T15:58:20.002Z  - global:[info]: action ............. : Submitting for bufferNumber 139838 (start commit for 139837)
  // 2022-03-30T15:58:20.002Z  - global:[info]: bufferNumber ....... : 139838
  // 2022-03-30T15:58:20.002Z  - global:[info]: maskedMerkleHash ... : 0x9a045d15598cf17ea677e84a11272ef8e5de35b178bf8e83984132c931a5a08b
  // 2022-03-30T15:58:20.002Z  - global:[info]: committedRandom .... : 0x54950462e398c0bbd48b9776f82421686da91ca5f7836c7136be854bb0b98e85
  // 2022-03-30T15:58:20.003Z  - global:[info]: revealedRandom ..... : 0xe200f7f748261c280454556cc205f1eacc21cd7a96e0c83854947c3cda74382c
  // 2022-03-30T15:58:20.003Z  - global:[debug]: sign Submitting for bufferNumber 139838 (start commit for 139837) wait #12/11
  // 2022-03-30T15:58:23.458Z  - global:[debug]: ^GETA round end: 7 sec
  // 2022-03-30T15:58:28.458Z  - global:[debug]: ^GETA round end: 2 sec
  // 2022-03-30T15:58:28.522Z  - global:[debug]: new block 446691 with 2 event(s)
  // 2022-03-30T15:58:28.523Z  - global:[error]: EVENT RoundFinalised 139838 0xa2922c06a15c40caf5895660c385db0aceb78948bc90f3f05d3325c39b78745a (commited root 0x3bb385355081b84bf683ede71d782f63c2349dd75e7f05f739b21cd8d3763fe2)
  

  // 2022-03-30T15:59:50.002Z  - global:[debug]: commit data prepared: roundId=139838 merkleTree.root=0x0d6811dd5dd4f4195be5e5e4da30ff4b86bf9cff32ace20c858a4b153faf5da4 random=0xab1e5afabbaad4ef23873796f67f40e8dfe007425dee0af3850fc95d15926fb6
  // 2022-03-30T15:59:50.002Z  - global:[info]: action ............. : Submitting for bufferNumber 139839 (start commit for 139838)
  // 2022-03-30T15:59:50.002Z  - global:[info]: bufferNumber ....... : 139839
  // 2022-03-30T15:59:50.003Z  - global:[info]: maskedMerkleHash ... : 0xa6764b27e67e20f67862d2722c4fbfa3595f9bbd6f42e8ff008582482a3d3212
  // 2022-03-30T15:59:50.003Z  - global:[info]: committedRandom .... : 0x6462dea562a50736e72f86cbdd6584a90912b2b70f06f8927f13eaf7b2e5a341
  // 2022-03-30T15:59:50.003Z  - global:[info]: revealedRandom ..... : 0xcfc876581e9942776008c084cd6652b20c76f8c598e7d2441e4f55b4e4f30f7d
  // 2022-03-30T15:59:50.004Z  - global:[debug]: sign Submitting for bufferNumber 139839 (start commit for 139838) wait #13/11
  // 2022-03-30T15:59:50.598Z  - global:[debug]: new block 446724 with 1 event(s)
  // 2022-03-30T15:59:50.599Z  - global:[error]: EVENT RoundFinalised 139839 0x97cf85454ed2b2b521cede7f410d4d8daf9d7ac896b07b29cc26cce9a75aa9ef (commited root 0x82e53163698555df7ddd54a0d176130d4a8add7237f4c43068e59b2e14e98831)



  // 2022-03-30T16:01:20.000Z  - global:[debug]: commit data prepared: roundId=139839 merkleTree.root=0xc8ecb68d21ce3ffab0e32765a02f859ff5edff592983fb323da34cf8e2fdec58 random=0x93d98309359803228cd8e8ed0436e0e107c36ca1b03bfb0a41de034f784d6635
  // 2022-03-30T16:01:20.001Z  - global:[info]: action ............. : Submitting for bufferNumber 139840 (start commit for 139839)
  // 2022-03-30T16:01:20.001Z  - global:[info]: bufferNumber ....... : 139840
  // 2022-03-30T16:01:20.001Z  - global:[info]: maskedMerkleHash ... : 0x5b35358414563cd83c3bcf88a419657ef22e93f899b800387c7d4fb79ab08a6d
  // 2022-03-30T16:01:20.001Z  - global:[info]: committedRandom .... : 0x4496e0674070398e4dadcc4a724a8f35904fe66afd604a9d66a5e43921ee7813
  // 2022-03-30T16:01:20.001Z  - global:[info]: revealedRandom ..... : 0xab1e5afabbaad4ef23873796f67f40e8dfe007425dee0af3850fc95d15926fb6
  // 2022-03-30T16:01:20.001Z  - global:[debug]: sign Submitting for bufferNumber 139840 (start commit for 139839) wait #14/11
  // 2022-03-30T16:01:20.491Z  - global:[debug]: new block 446757 with 1 event(s)
  // 2022-03-30T16:01:20.491Z  - global:[error]: EVENT RoundFinalised 139840 0x7de864a10b1a24b8e886884a7685d461fba5fb35017f29311c93dca196438a94 (commited root 0x55cc2b4d4715b309c67f28cedc417c4ae9a8cd74e0585cc7860e677dd556aff6) 


//   2022-03-30T16:02:50.001Z  - global:[debug]: commit data prepared: roundId=139840 merkleTree.root=0x1d9c406cf65043e733829a436171311a4ea9914f4bf89a1f2244ef21fa65cc82 random=0xcec8d6cefb230eb205907d673036d5f1e34f49ec95cba28ac8bb725d6835b298
// 2022-03-30T16:02:50.001Z  - global:[info]: action ............. : Submitting for bufferNumber 139841 (start commit for 139840)
// 2022-03-30T16:02:50.002Z  - global:[info]: bufferNumber ....... : 139841
// 2022-03-30T16:02:50.002Z  - global:[info]: maskedMerkleHash ... : 0xd35496a20d734d553612e7245147e4ebade6d8a3de333895eaff9d7c92507e1a
// 2022-03-30T16:02:50.002Z  - global:[info]: committedRandom .... : 0xed840767eeccae7e854327ef7ef77a63ab84bbcabbacc6d8b1b5bb9fc23443f1
// 2022-03-30T16:02:50.003Z  - global:[info]: revealedRandom ..... : 0x93d98309359803228cd8e8ed0436e0e107c36ca1b03bfb0a41de034f784d6635
// 2022-03-30T16:02:50.003Z  - global:[debug]: sign Submitting for bufferNumber 139841 (start commit for 139840) wait #15/11
// 2022-03-30T16:02:50.631Z  - global:[debug]: new block 446804 with 1 event(s)
// 2022-03-30T16:02:50.632Z  - global:[error]: EVENT RoundFinalised 139841 0xdd2d4de2d9f43cfb568fd10cca4a115676d679f7f3ba0a50e41e6c3a86fd6c4d (commited root 0x0d6811dd5dd4f4195be5e5e4da30ff4b86bf9cff32ace20c858a4b153faf5da4)

});