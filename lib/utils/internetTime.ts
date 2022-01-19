let timeSync = 0;

// time in milliseconds
export function getTimeMilli() {
  const now = new Date().getTime();

  return Math.round(now + timeSync);
}

// time in sec
export function getTimeSec() {
  return Math.floor(getTimeMilli() / 1000);
}

function convertFileTime2UnixTime(fileTime: number) {
  const winTicks = 10000000;
  const uEpoch = 11644473600;

  const unixTime = fileTime / winTicks - uEpoch;

  return unixTime;
}

export async function getInternetTime() {
  try {
    // todo: use NTC
    const serverUrl = "http://worldclockapi.com/api/json/utc/now";

    // const fetch = require( "node-fetch" );

    const fetch = require("node-fetch");

    const { performance } = require("perf_hooks");

    const time0 = performance.now();
    const response = await fetch(serverUrl);
    const time1 = performance.now();

    // todo: calculate internet lag time
    const now = new Date().getTime() / 1000;

    const data = await response.json();

    const nowInternet = convertFileTime2UnixTime(data.currentFileTime);

    const result = new Array(now, nowInternet);

    timeSync = Math.round((nowInternet - now) * 1000);

    return result;
  } catch (err) {
    return new Array(0, 0);
  }
}
