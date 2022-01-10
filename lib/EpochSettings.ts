import BN from "bn.js";
import { getTimeMilli, getTimeSec } from "./internetTime";
import { toBN } from "./utils";

export class EpochSettings {
  private _firstEpochStartTime: BN; // in seconds
  private _epochPeriod: BN; // in seconds

  private _firstEpochId: BN = toBN(0);

  // all values are in seconds
  constructor(_firstEpochStartTime: BN, _epochPeriod: BN) {
    this._firstEpochStartTime = _firstEpochStartTime;
    this._epochPeriod = _epochPeriod;
  }

  getEpochLength(): BN {
    return this._epochPeriod;
  }

  getEpochIdForTime(timeInMillis: BN): BN {
    const diff: BN = timeInMillis.sub(this._firstEpochStartTime);
    return this._firstEpochId.add(diff.div(this._epochPeriod));
  }

  getCurrentEpochId(): BN {
    return this.getEpochIdForTime(toBN(getTimeSec()));
  }

  // in seconds
  getEpochTimeEnd(): BN {
    const id: BN = this.getCurrentEpochId().add(toBN(1)).add(this._firstEpochId);
    return this._firstEpochStartTime.add(id.mul(this._epochPeriod));
  }

  // in seconds
  getEpochIdTimeEnd(id: BN | number): number {
    return this._firstEpochStartTime.add(toBN(id).mul(this._epochPeriod)).toNumber();
  }

  // in seconds
  getEpochIdCommitTimeEnd(id: number): number {
    return this.getEpochIdTimeEnd(id) + this._epochPeriod.toNumber();
  }
  // in seconds
  getEpochIdRevealTimeEnd(id: number): number {
    return this.getEpochIdTimeEnd(id) + this._epochPeriod.toNumber() * 2;
  }
}
