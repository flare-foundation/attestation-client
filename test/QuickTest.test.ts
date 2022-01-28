import { camelToSnakeCase, prefix0x, unPrefix0x } from "flare-mcc";

describe("test prefix", () => {
    it("Should test", async () => {
        let a = "asdasd"
        let b = prefix0x(a)
        console.log(a,b);

        let c = unPrefix0x(b)
        console.log(a,b,c)

          console.log(camelToSnakeCase("LukaNekiNeki"));
          
      }
    );


});
