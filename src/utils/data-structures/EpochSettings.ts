import { toBN } from "@flarenetwork/mcc";
import BN from "bn.js";
import { getTimeSec } from "../helpers/internetTime";

/**
 * Class for storing the settings of epochs. Current length of an epoch is 90 seconds.
 * Contains data about voting epochs on the StateConnector and BitVoting contracts.
 * Data is usually initialized externally and read from both smart contracts.
 * For the connection between rounds and epochs see Attestation-protocol.md
 * Values for construction must be given in seconds.
 */
export class EpochSettings {
  private _firstEpochStartTimeMs: bigint;
  private _epochPeriodMs: bigint;
  private _bitVoteWindowDurationMs?: bigint;

  // all values are in seconds
  constructor(_firstEpochStartTimeSec: bigint, _epochPeriodSec: bigint, _bitVoteWindowDurationSec?: bigint) {
    this._firstEpochStartTimeMs = _firstEpochStartTimeSec * 1000n;
    this._epochPeriodMs = _epochPeriodSec * 1000n;
    if (_bitVoteWindowDurationSec !== undefined) {
      this._bitVoteWindowDurationMs = _bitVoteWindowDurationSec * 1000n;
    }
  }

  /**
   *
   * @returns Start time of the first epoch in seconds
   */
  public firstEpochStartTimeSec() {
    return this._firstEpochStartTimeMs / 1000n;
  }

  /**
   *
   * @returns Epoch duration in seconds
   */
  public epochPeriodSec() {
    return this._epochPeriodMs / 1000n;
  }

  /**
   *
   * @returns Bitvote window duration in seconds
   */
  public bitVoteWindowDurationSec() {
    return this._bitVoteWindowDurationMs / 1000n;
  }

  /**
   * Epoch length in milliseconds.
   * @returns
   */
  public getEpochLengthMs(): bigint {
    return this._epochPeriodMs;
  }

  /**
   * Bitvote window duration.
   * @returns
   */
  public getBitVoteDurationMs(): bigint {
    if (this._bitVoteWindowDurationMs) {
      return this._bitVoteWindowDurationMs;
    }
    return BigInt(0);
  }

  /**
   * Returns epochId for time given in milliseconds (Unix epoch).
   * @param timeInMillis
   * @returns
   */
  public getEpochIdForTime(timeInMillis: bigint): number {
    const diff = timeInMillis - this._firstEpochStartTimeMs;
    return Number(diff / this._epochPeriodMs);
  }

  /**
   * Returns epochId for time given in seconds (Unix epoch).
   * @param timeSec
   * @returns
   */
  public getEpochIdForTimeSec(timeSec: number): number {
    const epochId = this.getEpochIdForTime(BigInt(timeSec) * 1000n);
    return epochId;
  }

  /**
   * Given time @param timeSec in seconds, it determines the epoch of the time and
   * checks if it is within the bit voting deadline.
   * @param timeSec
   * @returns If the time is within the bit voting deadline, the epoch id is returned.
   * Otherwise 'undefined' is returned.
   */
  public getEpochIdForBitVoteTimeSec(timeSec: number): number | undefined {
    const timeMs = BigInt(timeSec) * 1000n;
    const epochId = this.getEpochIdForTime(timeMs);
    const epochStartTime = this._firstEpochStartTimeMs + BigInt(epochId) * this._epochPeriodMs;
    const offset = timeMs - epochStartTime;
    if (offset <= this._bitVoteWindowDurationMs) {
      return epochId;
    }
    return undefined;
  }

  /**
   * Gets the id of the current epoch. It is the same as the id of the round that is currently in the request phase
   */
  public getCurrentEpochId(): number {
    return this.getEpochIdForTime(BigInt(getTimeSec()) * 1000n);
  }

  /**
   * Gets the start time of the round in milliseconds. The round starts in the request phase.
   */
  public getRoundIdTimeStartMs(id: number): bigint {
    return this._firstEpochStartTimeMs + BigInt(id) * this._epochPeriodMs;
  }

  /**
   * Gets the end time of the epoch in milliseconds
   */
  public getEpochIdTimeEndMs(id: number): bigint {
    return this.getRoundIdTimeStartMs(id) + this._epochPeriodMs;
  }

  /**
   * Gets the start time of the Reveal phase of the round in milliseconds
   */
  public getRoundIdRevealTimeStartMs(id: number): bigint {
    return this.getEpochIdTimeEndMs(id) + this._epochPeriodMs;
  }
}
