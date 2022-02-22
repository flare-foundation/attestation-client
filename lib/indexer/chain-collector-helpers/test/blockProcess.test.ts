import { assert } from "console";
import { ChainType, MCC } from "flare-mcc";
import { processBlockAlgo, processBlockDefault, processBlockXrp } from "../processBlock";


const CHAIN = ChainType.XRP;
const URL = "https://xrplcluster.com";
const USERNAME = ""
const PASSWORD = ""

const testNetUrl = "http://testnode3.c.aflabs.net:4001/";
const algodToken = "7f90419ceab8fde42b2bd50c44ed21c0aefebc614f73b27619549f366b060a14";

const testNetUrlIndexer = "http://testnode3.c.aflabs.net:8980/";
const token = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadddd";

const algoCreateConfig = {
    algod: {
        url: testNetUrl,
        token: algodToken,
    },
    indexer: {
        url: testNetUrlIndexer,
        token: token,
    },
};

describe("Test process helpers ", () => {
   let client: MCC.XRP;
   let algoClient: MCC.ALGO;

   beforeEach(async () => {
      client = MCC.Client(CHAIN, { url: URL, username: USERNAME, password: PASSWORD }) as MCC.XRP;
      algoClient = new MCC.ALGO(algoCreateConfig);
   });


   it(`Test ripple block processing `, async function () {
      const block = await client.getBlock(69_713_705)
      let Mapper = processBlockXrp
      let mapper = Mapper(block)
      const txInBlock = 'C2A3295B5D6116AECE3E34D0C5E6901DFCDE63C440401E08351A4A2C855A1387'
      const acc = 'rEW8BjpMyFZfGMjqbykbhpnr4KEb2qr6PC'
      // console.log(mapper.get(txInBlock));
      assert(mapper.get(txInBlock).Account,acc)
   });

   it(`Test algo block processing `, async function () {
      const block = await algoClient.getBlock(140_000)
      // console.log(block);
      let Mapper = processBlockAlgo
      let mapper = Mapper(block)
      // console.log(mapper);
      const txInBlock = 'VRM3PXMX6GAOQWFHN3LIWJJ2WY2DTKB3UETY6K25PXMYHZWA3HLQ'
      console.log(mapper.get(txInBlock));
      assert(mapper.get(txInBlock).txType,'pay')
      
   });


   it(`Test default block processing `, async function () {
    let defaultMaper = processBlockDefault
    let mapper = defaultMaper({})
   //  console.log(mapper);
    console.log(mapper.get('F976B3BC5E73BC107F75F8E35F00919D4D7DFCFB5B2552F36DD7D8E284BB22C0'));
 });    
})