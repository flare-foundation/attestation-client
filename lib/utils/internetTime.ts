let timeSync = 0;
// What is timeSync used for?
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
