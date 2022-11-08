import BN from "bn.js";
import { toBN } from "@flarenetwork/mcc";
import { getTimeSec } from "./internetTime";

/**
 * Class for storing the settings of epochs. Current length of an epoch is 90 seconds.
 * For the connection between rounds and epoches see Attestation-protocol.md
 * Values for construction must be given in seconds.
 */
export class EpochSettings {
  private _firstEpochStartTime: BN; // in milliseconds
  private _epochPeriod: BN; // in milliseconds

  private _firstEpochId: BN = toBN(0);

  // all values are in seconds
  constructor(_firstEpochStartTimeSec: BN, _epochPeriodSec: BN) {
    this._firstEpochStartTime = _firstEpochStartTimeSec.mul(toBN(1000));
    this._epochPeriod = _epochPeriodSec.mul(toBN(1000));
  }

  getEpochLengthMs(): BN {
    return this._epochPeriod;
  }

  getEpochIdForTime(timeInMillis: BN): BN {
    const diff: BN = timeInMillis.sub(this._firstEpochStartTime);
    return this._firstEpochId.add(diff.div(this._epochPeriod));
  }

  /**
   * Gets the id of the current epoch. It is the same as the id of the round that is currently in the request phase
   */
  getCurrentEpochId(): BN {
    return this.getEpochIdForTime(toBN(getTimeSec() * 1000));
  }

  /**
   * Gets the start time of the round in milliseconds. The round starts in the request phase.
   */
  getRoundIdTimeStartMs(id: BN | number): number {
    return this._firstEpochStartTime.add(toBN(id).mul(this._epochPeriod)).toNumber(); // + this._epochPeriod.toNumber();
  }

  /**
   * Gets the end time of the epoch in milliseconds
   */
  getEpochIdTimeEndMs(id: BN | number): number {
    return this.getRoundIdTimeStartMs(id) + this._epochPeriod.toNumber();
  }

  /**
   * Gets the start time of the commit phase of the round in milliseconds
   */
  getRoundIdCommitTimeStartMs(id: BN | number): number {
    return this.getRoundIdTimeStartMs(id) + this._epochPeriod.toNumber();
  }

  /**
   * Gets the start time of the Reveal phase of the round in milliseconds
   */
  getRoundIdRevealTimeStartMs(id: number): number {
    return this.getRoundIdCommitTimeStartMs(id) + this._epochPeriod.toNumber();
  }
}
