import { ethers } from "ethers";

// Configuration of source IDs
export enum SourceId {
  // Chain Sources should match the enum ChainType in flare-mcc library
  invalid = -1,
  BTC = 0,
  LTC = 1,
  DOGE = 2,
  XRP = 3,
  ALGO = 4,
}

export const HIGHEST_SOURCE_ID = 4;

/**
 * Returns source name for `sourceId`
 * @param sourceId
 * @returns
 */
export function getSourceName(sourceId: number) {
  if (sourceId == null || SourceId[sourceId] === undefined) {
    return null;
  }
  return SourceId[sourceId];
}

/**
 * Returns sourceId enum given either name or enum number.
 * Note: that function does not do any additional validity checks so it must be
 * called by user with correct (sensible) id number.
 * @param id
 * @returns
 */
export function toSourceId(id: any): SourceId {
  if (typeof id === "number") return id as SourceId;

  const sourceId = SourceId[id];

  if (sourceId === undefined) return SourceId.invalid;

  return sourceId as any as SourceId;
}


export function sourceIdToBytes32(sourceId: SourceId): string {
  let value = sourceId.toString(16);
  value = value.length % 2 === 0 ? "0x" + value : "0x0" + value;
  return ethers.zeroPadValue(value, 32);
}
