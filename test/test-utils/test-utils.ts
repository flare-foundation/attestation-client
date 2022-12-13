import { traceManager } from "@flarenetwork/mcc";
import { getGlobalLogger } from "../../lib/utils/logger";
import { getRetryFailureCallback, setRetryFailureCallback } from "../../lib/utils/PromiseTimeout";

export const TERMINATION_TOKEN = "Mock Application terminated";

export async function testWithoutLoggingTracingAndApplicationTermination(func: any, noTracing = true, noLogging = true, noTermination = true) {
   const oldTracing = traceManager.displayStateOnException;
   const oldLevel = getGlobalLogger().level;
   const oldOnRetryFailure = getRetryFailureCallback();
   if (noLogging) {
      traceManager.displayStateOnException = false;
   }
   if (noTermination) {
      setRetryFailureCallback((label: string) => { throw new Error(TERMINATION_TOKEN) });
   }
   if (noLogging) {
      getGlobalLogger().level = "alert";
   }

   await func();

   // recover
   traceManager.displayStateOnException = oldTracing;
   getGlobalLogger().level = oldLevel;
   setRetryFailureCallback(oldOnRetryFailure);
}

/**
 * Returns truncated file path.
 * @param file module filename
 * @returns file path from `test/` on, separated by `'/'`
 */
 export function getTestFile(myFile: string) {
   return myFile.slice(myFile.replace(/\\/g, '/').indexOf("test/"));
 };
