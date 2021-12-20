import { DogeRpcInterface } from '../RPCtypes';
import { UtxoCore } from '../UtxoCore';

export class DOGEImplementation extends UtxoCore implements DogeRpcInterface {
  constructor(
    url: string,
    username: string,
    password: string,
    inRegTest: boolean = false
  ) {
    super(url, username, password, inRegTest);
  }
}
