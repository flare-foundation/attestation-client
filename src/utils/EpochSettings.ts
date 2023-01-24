import BN from "bn.js";
import { toBN } from "@flarenetwork/mcc";
import { getTimeSec } from "./internetTime";

/**
 * Class for storing the settings of epochs. Current length of an epoch is 90 seconds.
 * For the connection between rounds and epoches see Attestation-protocol.md
 * Values for construction must be given in seconds.
 */
export class EpochSettings {
  private _firstEpochStartTimeMs: BN;
  private _epochPeriodMs: BN; 
  private _bitVoteWindowDurationMs?: BN; 

  // all values are in seconds
  constructor(_firstEpochStartTimeSec: BN, _epochPeriodSec: BN, _bitVoteWindowDurationSec?: BN) {
    this._firstEpochStartTimeMs = _firstEpochStartTimeSec.mul(toBN(1000));
    this._epochPeriodMs = _epochPeriodSec.mul(toBN(1000));
    if(_bitVoteWindowDurationSec !== undefined) {
      this._bitVoteWindowDurationMs = _bitVoteWindowDurationSec.mul(toBN(1000));
    }
  }

  getEpochLengthMs(): BN {
    return this._epochPeriodMs;
  }

  getEpochIdForTime(timeInMillis: BN): BN {
    const diff: BN = timeInMillis.sub(this._firstEpochStartTimeMs);
    return diff.div(this._epochPeriodMs);
  }

  getEpochIdForTimeSec(timeSec: number): number {
    const epochId = this.getEpochIdForTime(toBN(timeSec).mul(toBN(1000)));
    return epochId.toNumber();
  }

  /**
   * Given time @param timeSec in seconds, it determines the epoch of the time and
   * checks if it is within the bit voting deadline. 
   * @param timeSec 
   * @returns If the time is within the bit voting deadline, the epoch id is returned.
   * Otherwise 'undefined' is returned.
   */
  getEpochIdForBitVoteTimeSec(timeSec: number): number | undefined {
    let timeMs = toBN(timeSec).mul(toBN(1000));
    let epochId = this.getEpochIdForTime(timeMs);
    let epochStartTime = this._firstEpochStartTimeMs.add(epochId.mul(this._epochPeriodMs))
    let offset = timeMs.sub(epochStartTime);
    if(offset.lte(this._bitVoteWindowDurationMs)) {
      return epochId.toNumber();
    }
    return undefined;
  }
  
  getOffsetInBufferWindow(timeSec: number) {
    let epochId = this.getEpochIdForTimeSec(timeSec);
    return timeSec - Math.round(this._firstEpochStartTimeMs.toNumber()/1000) + epochId * Math.round(this._epochPeriodMs.toNumber()/1000);
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
    return this._firstEpochStartTimeMs.add(toBN(id).mul(this._epochPeriodMs)).toNumber(); // + this._epochPeriod.toNumber();
  }

  /**
   * Gets the end time of the epoch in milliseconds
   */
  getEpochIdTimeEndMs(id: BN | number): number {
    return this.getRoundIdTimeStartMs(id) + this._epochPeriodMs.toNumber();
  }

  /**
   * Gets the start time of the commit phase of the round in milliseconds
   */
  getRoundIdCommitTimeStartMs(id: BN | number): number {
    return this.getRoundIdTimeStartMs(id) + this._epochPeriodMs.toNumber();
  }

  /**
   * Gets the start time of the Reveal phase of the round in milliseconds
   */
  getRoundIdRevealTimeStartMs(id: number): number {
    return this.getRoundIdCommitTimeStartMs(id) + this._epochPeriodMs.toNumber();
  }
}
