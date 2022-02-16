import { ChainType, MCC } from "flare-mcc";
import { processBlockSwitch } from "../processBlock";


const CHAIN = ChainType.XRP;
const URL = "https://xrplcluster.com";
const USERNAME = ""
const PASSWORD = ""


describe("Test process helpers ", () => {
   let client: MCC.XRP;

   beforeEach(async () => {
      client = MCC.Client(CHAIN, { url: URL, username: USERNAME, password: PASSWORD }) as MCC.XRP;
   });


   it(`Test ripple block processing `, async function () {
      const block = await client.getBlock(69_713_705)
      console.log(block);
      let defaultMaper = processBlockSwitch(CHAIN)
      let mapper = defaultMaper(block)
      // console.log(mapper);
      console.log(mapper.get('F976B3BC5E73BC107F75F8E35F00919D4D7DFCFB5B2552F36DD7D8E284BB22C0'));
   });


   it(`Test ripple block processing `, async function () {
    let defaultMaper = processBlockSwitch(ChainType.BTC)
    let mapper = defaultMaper({})
    console.log(mapper);
    console.log(mapper.get('F976B3BC5E73BC107F75F8E35F00919D4D7DFCFB5B2552F36DD7D8E284BB22C0'));
 });    
})