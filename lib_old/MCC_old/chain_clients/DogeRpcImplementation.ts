import { DogeRpcInterface, UtxoMccCreate } from "../types";
import { UtxoCore } from "../UtxoCore";

export class DOGEImplementation extends UtxoCore implements DogeRpcInterface {
  constructor(options: UtxoMccCreate) {
    super(options.url, options.username, options.password, options.inRegTest || false);
  }
}
