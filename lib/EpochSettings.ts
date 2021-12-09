import { BigNumber } from 'ethers';
import { getTime } from './internetTime';

export class EpochSettings {
    private _firstEpochStartTime: BigNumber;     // in milliseconds
    private _epochPeriod: BigNumber;            // in milliseconds

    private _firstEpochId: BigNumber = BigNumber.from(0);

    // all values are in milliseconds
    constructor(_firstEpochStartTime: BigNumber, _epochPeriod: BigNumber) {
        this._firstEpochStartTime = _firstEpochStartTime;
        this._epochPeriod = _epochPeriod;
    }

    getEpochIdForTime(timeInMillis: number): BigNumber {
        const diff: BigNumber = BigNumber.from(timeInMillis).sub(this._firstEpochStartTime);
        return this._firstEpochId.add(diff.div(this._epochPeriod));
    }

    getCurrentEpochId(): BigNumber {
        return this.getEpochIdForTime(getTime());
    }

    // in milliseconds
    getEpochTimeEnd(): BigNumber {
        const id: BigNumber = this.getCurrentEpochId().add(BigNumber.from(1)).add(this._firstEpochId);
        return this._firstEpochStartTime.add(id.mul(this._epochPeriod));
    }

    // in milliseconds
    getEpochPeriod(): BigNumber {
        return this._epochPeriod;
    }

}