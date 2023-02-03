const timeSync = 0;

/**
 * Returns time passed from 1 January 1970 in milliseconds, UTC
 * @returns
 */
export function getTimeMilli() {
  const now = new Date().getTime();
  if (process.env.NODE_ENV === "development") {
    if (process.env.TEST_OFFSET_TIME) {
      let offset = parseInt('' + process.env.TEST_OFFSET_TIME, 10);
      return now + offset * 1000;
    }
    if (process.env.TEST_SCHEDULER_TIME) {
      return parseInt('' + process.env.TEST_SCHEDULER_TIME, 10);
    }
  }

  return Math.round(now + timeSync);
}

/**
 * Returns time passed from 1 January 1970 in seconds, UTC
 * @returns
 */
export function getTimeSec() {
  return Math.floor(getTimeMilli() / 1000);
}
