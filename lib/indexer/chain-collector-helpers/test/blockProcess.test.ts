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
      console.log(block);
      let defaultMaper = processBlockXrp
      let mapper = defaultMaper(block)
      // console.log(mapper);
      console.log(mapper.get('F976B3BC5E73BC107F75F8E35F00919D4D7DFCFB5B2552F36DD7D8E284BB22C0'));
   });

   it(`Test algo block processing `, async function () {
      const block = await algoClient.getBlock(69_713_705)
      console.log(block);
      let defaultMaper = processBlockAlgo
      let mapper = defaultMaper(block)
      // console.log(mapper);
      console.log(mapper.get('F976B3BC5E73BC107F75F8E35F00919D4D7DFCFB5B2552F36DD7D8E284BB22C0'));
   });


   it(`Test default block processing `, async function () {
    let defaultMaper = processBlockDefault
    let mapper = defaultMaper({})
    console.log(mapper);
    console.log(mapper.get('F976B3BC5E73BC107F75F8E35F00919D4D7DFCFB5B2552F36DD7D8E284BB22C0'));
 });    
})