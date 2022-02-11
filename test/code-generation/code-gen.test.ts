import { createTypesFile, fnameToAttTypeId, getAttTypesDefinitionFiles } from "../../lib/verification/utils/attestation-codegen-helpers";

describe("Code generation tests", function () {

  it("Should find some files", async function () {
    let res = await getAttTypesDefinitionFiles();
    let ids = res.map((name) => fnameToAttTypeId(name));
    createTypesFile()
    console.log(ids)
  });

});
