import { retry as mccRetry } from "@flarenetwork/mcc";
import { getGlobalLogger, logException } from "./logger";

let DEFAULT_TIMEOUT = 60000;
let DEFAULT_RETRY = 10;
let DEFAULT_BACK_OFF_TIME = 1000;

let onRetryFailure: (label: string) => void = (label) => { 
  getGlobalLogger().error(`failure callback not set (label '${label}')`);
  throw new Error("FailureCallbackNotSet");
};

export function failureCallback(label: string) {

  if (!onRetryFailure) {
    getGlobalLogger().error(`failure callback not set (label '${label}')`);
    throw new Error("FailureCallbackNotSet");
    }
  else {
    onRetryFailure(label);
  }
}

export function setRetryFailureCallback(failure: (label: string) => void) {
  onRetryFailure = failure;
}

export async function retry<T>(
  label: string,
  funct: (...args: any) => T,
  timeoutTime: number = DEFAULT_TIMEOUT,
  numRetries: number = DEFAULT_RETRY,
  backOffTime = DEFAULT_BACK_OFF_TIME
): Promise<T> {
  return await mccRetry(label, funct, timeoutTime, numRetries, backOffTime, getGlobalLogger().warning, getGlobalLogger().debug, onRetryFailure);
}

export async function retryMany(
  label: string,
  functs: any[],
  timeoutTime: number = DEFAULT_TIMEOUT,
  numRetries: number = DEFAULT_RETRY,
  backOffTime = DEFAULT_BACK_OFF_TIME
) {
  return Promise.all(functs.map((funct) => retry(label, funct, timeoutTime, numRetries, backOffTime)));
}

export function safeCatch<T>(label: string, funct: any) {
  try {
    funct();
  } catch (error) {
    logException(error, label);
  }
}
