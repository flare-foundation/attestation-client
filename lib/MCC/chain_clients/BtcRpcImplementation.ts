import { UtxoRpcInterface } from "../RPCtypes";
import { UtxoCore } from "../UtxoCore";

export class BTCImplementation extends UtxoCore implements UtxoRpcInterface {
  constructor(url: string, username: string, password: string, inRegTest: boolean = false) {
    super(url, username, password, inRegTest);
  }
}
