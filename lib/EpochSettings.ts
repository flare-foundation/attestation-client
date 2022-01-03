import { getTime } from "./internetTime";
import { toBN } from "./utils";


export class EpochSettings {
  private _firstEpochStartTime: BN; // in milliseconds
  private _epochPeriod: BN; // in milliseconds

  private _firstEpochId: BN = toBN(0);

  // all values are in milliseconds
  constructor(_firstEpochStartTime: BN, _epochPeriod: BN) {
    this._firstEpochStartTime = _firstEpochStartTime;
    this._epochPeriod = _epochPeriod;
  }

  getEpochIdForTime(timeInMillis: BN): BN {
    const diff: BN = timeInMillis.sub(this._firstEpochStartTime);
    return this._firstEpochId.add(diff.div(this._epochPeriod));
  }

  getCurrentEpochId(): BN {
    return this.getEpochIdForTime(toBN(getTime()));
  }

  // in milliseconds
  getEpochTimeEnd(): BN {
    const id: BN = this.getCurrentEpochId().add(toBN(1)).add(this._firstEpochId);
    return this._firstEpochStartTime.add(id.mul(this._epochPeriod));
  }

  // in milliseconds
  getEpochPeriod(): BN {
    return this._epochPeriod;
  }
}
