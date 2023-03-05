import { prefix0x, unPrefix0x } from "@flarenetwork/mcc";
import { BitVote } from "../../typechain-web3-v1/BitVoting";

/**
 * Choose Round data event emitted by attestation providers when they choose which requests can be attested to
 */
export class BitVoteData {
  sender: string;
  timestamp: number;
  data: string;

  constructor(event?: BitVote) {
    if (!event) return;
    this.sender = event.returnValues.sender;
    this.timestamp = parseInt(event.returnValues.timestamp, 10);
    this.data = event.returnValues.data;
    if (!this.data || unPrefix0x(this.data).length < 2) {
      throw new Error("Incorrect bit vote");
    }
  }

  /**
   * Checks if round check byte of data matches the round.
   * @param roundId
   * @returns
   */
  roundCheck(roundId: number): boolean {
    if (!this.data || unPrefix0x(this.data).length < 2) {
      return false;
    }
    return parseInt(unPrefix0x(this.data).slice(0, 2), 16) === roundId % 256;
  }

  /**
   * Returns bit vote part of the data (without round check byte)
   */
  get bitVote(): string {
    if (!this.data || unPrefix0x(this.data).length < 2) {
      return "0x00";
    }
    return prefix0x(unPrefix0x(this.data).slice(2));
  }
}
