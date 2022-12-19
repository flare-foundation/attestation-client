// This should always be on the top of the file, before imports
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import fs from "fs";
import { getTestFile } from "../test-utils/test-utils";

chai.use(chaiAsPromised);



describe(`Attester client full on synthetic verifier data (${getTestFile(__filename)})`, () => {
   let stateConnectorAddress: string;

   before(async () => {
      stateConnectorAddress = fs.readFileSync(".tmp-state-connector-address").toString();
   });

   it("Cashing test", async function () {
   });
});
