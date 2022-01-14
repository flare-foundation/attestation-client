import { UtxoMccCreate, UtxoRpcInterface } from "../types";
import { UtxoCore } from "../UtxoCore";

export class LTCImplementation extends UtxoCore implements UtxoRpcInterface {
  constructor(options: UtxoMccCreate) {
    super(options.url, options.username, options.password, options.inRegTest || false);
  }
}
