import { BigNumber } from "ethers";

export class DataTransaction {
  // event parameters
  transactionHash!: string;
  timeStamp!: BigNumber;
  blockHeight!: BigNumber;
  utxo!: number;
  full!: boolean;

  // block parameters
  blockNumber!: BigNumber;
  transactionIndex!: BigNumber;
  signature!: BigNumber;
}
