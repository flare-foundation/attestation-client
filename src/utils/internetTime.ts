const timeSync = 0;

/**
 * Returns time passed from 1 January 1970 in milliseconds, UTC
 * @returns
 */
export function getTimeMilli() {
  const now = new Date().getTime();

  return Math.round(now + timeSync);
}

/**
 * Returns time passed from 1 January 1970 in seconds, UTC
 * @returns
 */
export function getTimeSec() {
  return Math.floor(getTimeMilli() / 1000);
}
