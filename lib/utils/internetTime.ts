let timeSync = 0;
// For what is timeSync used?
// Which timezone??
/**
 * Returns time passed from 1 January 1970 in milliseconds
 * @returns
 */
export function getTimeMilli(): number {
  const now = new Date().getTime();

  return Math.round(now + timeSync);
}

/**
 * Returns time passed from 1 January 1970 in seconds
 * @returns
 */
export function getTimeSec(): number {
  return Math.floor(getTimeMilli() / 1000);
}
