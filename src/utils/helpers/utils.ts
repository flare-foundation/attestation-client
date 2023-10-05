import { getGlobalLogger } from "../logging/logger";

// used for return after exit(1) so that return is actually called after mocked exit
export const MOCK_NULL_WHEN_TESTING = null;

/**
 * Removes an element from an array.
 * @param array
 * @param element
 */
export function arrayRemoveElement<T>(array: T[], element: T) {
  const index = array.indexOf(element, 0);
  if (index > -1) {
    array.splice(index, 1);
  }
}

/**
 * Limiter of a string length. Used for capping strings when writing to the database. Equipped with global logger.
 * @param text the input string
 * @param maxLength length limitation
 * @param reportOverflow logs limitation if true
 * @returns capped string
 */
export function prepareString(text: string, maxLength: number, reportOverflow: string = null): string {
  if (!text) return "";
  if (text.length < maxLength) return text;

  if (typeof text != "string") {
    getGlobalLogger().warning(`prepareString warning: expected type is string`);
    return text;
  }

  if (reportOverflow) {
    getGlobalLogger().warning(`prepareString warning: ${reportOverflow} overflow ${maxLength} (length=${text.length})`);
  }

  return text.substring(0, maxLength);
}

/**
 * Current unix epoch (in seconds)
 * @returns unix epoch of now
 */
export function getUnixEpochTimestamp(): number {
  const now = Math.floor(Date.now() / 1000);
  if (process.env.NODE_ENV === "development") {
    if (process.env.TEST_OFFSET_TIME_MS) {
      const offset = parseInt("" + process.env.TEST_OFFSET_TIME_MS, 10);
      return now + offset;
    }
    if (process.env.TEST_SCHEDULER_TIME_MS) {
      return parseInt("" + process.env.TEST_SCHEDULER_TIME_MS, 10);
    }
  }
  return now;
}

/**
 * Sleep function
 * @param milliseconds time to sleep
 */
export async function sleepMs(milliseconds: number) {
  await new Promise((resolve: any) => {
    setTimeout(() => {
      resolve();
    }, milliseconds);
  });
}

/**
 * Time formatter
 * @param time given time as a number (unix epoch in seconds)
 * @param secDecimals decimals to round seconds
 * @returns
 */
export function secToHHMMSS(time: number, secDecimals = 0) {
  const days = Math.floor(time / (3600 * 24));
  let hours = Math.floor(time / 3600);
  const minutes = Math.floor((time - hours * 3600) / 60);
  const seconds = round(time - hours * 3600 - minutes * 60, secDecimals);

  hours = hours % 24;

  let sdays = "";

  if (days > 0) {
    sdays = days.toString() + " ";
  }

  const shours: string = hours.toString().padStart(2, "0");
  const smin: string = minutes.toString().padStart(2, "0");
  const ssec: string = seconds.toString().padStart(2, "0");

  return sdays + shours + ":" + smin + ":" + ssec;
}

/**
 * Rounds a number to a given number of decimals
 * @param x given number
 * @param decimal decimals to round
 * @returns
 */
export function round(x: number, decimal = 0) {
  if (decimal === 0) return Math.round(x);
  const dec10 = 10 ** decimal;
  return Math.round(x * dec10) / dec10;
}

//
/**
 * Helper for parsing Maps.
 * Use in JSON.parse( x , JSONMapParser ) to load Map saved with above function
 * @param key not used, just for compatibility
 * @param value the map to be parsed
 * @returns the Map parsed from JSON.
 */
export function JSONMapParser(key: any, value: any) {
  if (typeof value === "object" && value !== null) {
    if (value.dataType === "Map") {
      return new Map(value.value);
    }
  }
  return value;
}

/**
 * Print out TypeORM query with parameters.
 * Test or debug purposes only.
 * @param query
 */
export function queryPrint(query: any) {
  let [sql, params] = query.getQueryAndParameters();
  params.forEach((value) => {
    if (typeof value === "string") {
      sql = sql.replace("?", `"${value}"`);
    }
    if (typeof value === "object") {
      if (Array.isArray(value)) {
        sql = sql.replace("?", value.map((element) => (typeof element === "string" ? `"${element}"` : element)).join(","));
      } else {
        sql = sql.replace("?", value);
      }
    }
    if (["number", "boolean"].includes(typeof value)) {
      sql = sql.replace("?", value.toString());
    }
  });
  // tslint:disable-next-line:no-console
  console.log(sql);
}

// deprecated
// /**
//  * Checks that globally set enumerations of chains in Multi Chain Client and Attestation Client match
//  */
// export function checkChainTypesMatchSourceIds(logger?: AttLogger): boolean {
//   let isMatching = true;
//   for (const value in ChainType) {
//     if (typeof ChainType[value] === "number") {
//       if (ChainType[value] !== SourceId[value]) {
//         isMatching = false;
//         logger?.error2(
//           `ChainType and Source value mismatch ChainType.${ChainType[ChainType[value] as any]}=${ChainType[value]}, Source.${
//             SourceId[SourceId[value] as any]
//           }=${SourceId[value]}`
//         );
//       }

//       if (ChainType[ChainType[value] as any] !== SourceId[SourceId[value] as any]) {
//         isMatching = false;
//         logger?.error2(
//           `ChainType and Source key mismatch ChainType.${ChainType[ChainType[value] as any]}=${ChainType[value]}, Source.${SourceId[SourceId[value] as any]}=${
//             SourceId[value]
//           }`
//         );
//       }
//     }
//   }
//   return isMatching;
// }
