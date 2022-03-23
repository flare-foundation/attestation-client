import BN from "bn.js";
import { toBN } from "flare-mcc";
import { getTimeSec } from "./internetTime";

export class EpochSettings {
  private _firstEpochStartTime: BN; // in seconds
  private _epochPeriod: BN; // in seconds

  private _firstEpochId: BN = toBN(0);

  // all values are in seconds
  constructor(_firstEpochStartTime: BN, _epochPeriod: BN) {
    this._firstEpochStartTime = _firstEpochStartTime.mul(toBN(1000));
    this._epochPeriod = _epochPeriod.mul(toBN(1000));
  }

  getEpochLengthMs(): BN {
    return this._epochPeriod;
  }

  getEpochIdForTime(timeInMillis: BN): BN {
    const diff: BN = timeInMillis.sub(this._firstEpochStartTime);
    return this._firstEpochId.add(diff.div(this._epochPeriod));
  }

  getCurrentEpochId(): BN {
    return this.getEpochIdForTime(toBN(getTimeSec()));
  }

  
  // // in seconds
  // getEpochTimeStart(): BN {
  //   const id: BN = this.getCurrentEpochId().add(toBN(1)).add(this._firstEpochId);
  //   return this._firstEpochStartTime.add(id.mul(this._epochPeriod));
  // }

  // // in seconds
  // getEpochTimeEnd(): BN {
  //   return this.getEpochTimeStart().add(this._epochPeriod);
  // }

  // in milliseconds
  getRoundIdTimeStartMs(id: BN | number): number {
    return this._firstEpochStartTime.add(toBN(id).mul(this._epochPeriod)).toNumber(); // + this._epochPeriod.toNumber();
  }

  // in milliseconds
  getRoundIdCommitTimeStartMs(id: BN | number): number {
    return this.getRoundIdTimeStartMs(id) + this._epochPeriod.toNumber();
  }

  // in milliseconds
  getRoundIdRevealTimeStartMs(id: number): number {
    return this.getRoundIdCommitTimeStartMs(id) + this._epochPeriod.toNumber();
  }
  // in milliseconds
  getEpochIdRevealTimeEndMs(id: number): number {
    return this.getRoundIdCommitTimeStartMs(id) + this._epochPeriod.toNumber() * 2;
  }
}
