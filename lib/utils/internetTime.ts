const timeSync = 0;

// time in milliseconds
export function getTimeMilli() {
  const now = new Date().getTime();

  return Math.round(now + timeSync);
}

// time in sec
export function getTimeSec() {
  return Math.floor(getTimeMilli() / 1000);
}
