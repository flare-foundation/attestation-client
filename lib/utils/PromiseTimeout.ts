import { retry as mccRetry } from "@flarenetwork/mcc";
import { getGlobalLogger, logException } from "./logger";

const DEFAULT_TIMEOUT = 60000;
const DEFAULT_RETRY = 10;
const DEFAULT_BACK_OFF_TIME = 1000;

/**
 * Global setting of failure callback
 * @param label logging label
 */
let onRetryFailure: (label: string) => void = (label) => {
  getGlobalLogger().error(`failure callback not set (label '${label}')`);
  throw new Error("FailureCallbackNotSet");
};

/**
 * Executes the global failure callback. This should be called in critical cases,
 * for example on many retries executed, when something is clearly wrong with 
 * some external system. In production the callback typically terminates the 
 * application. If the application is set up as a system service, the system 
 * then restarts the application. It is assumed that the application is 
 * self-recoverable, meaning that it can set up or reset into the correct state on each
 * start
 * @param label logging label
 */
export function failureCallback(label: string) {
  if (!onRetryFailure) {
    getGlobalLogger().error(`failure callback not set (label '${label}')`);
    throw new Error("FailureCallbackNotSet");
  }
  else {
    onRetryFailure(label);
  }
}

/**
 * Sets the system failure callback.
 * @param failure callback with logging label to be executed on system failure
 */
export function setRetryFailureCallback(failure: (label: string) => void) {
  onRetryFailure = failure;
}

/**
 * Returns system failure callback.
 * @returns 
 */
export function getRetryFailureCallback() {
  return onRetryFailure;
}

/**
 * Async function retry wrapper and error handler. Enables guaarded call of the proposed 
 * async function call `funct`, with prescribed timeout, number of retires and back-off 
 * on retires.
 * @param label logging label
 * @param funct async function to be called in form () => function_name()
 * @param timeoutTime timeout to be used 
 * @param numRetries number of retires
 * @param backOffTime back off time on each retry
 * @returns 
 */
export async function retry<T>(
  label: string,
  funct: (...args: any) => T,
  timeoutTime: number = DEFAULT_TIMEOUT,
  numRetries: number = DEFAULT_RETRY,
  backOffTime = DEFAULT_BACK_OFF_TIME
): Promise<T> {
  return await mccRetry(label, funct, timeoutTime, numRetries, backOffTime, getGlobalLogger().warning, getGlobalLogger().debug, onRetryFailure);
}

/**
 * Async function retry wrapper and error handler. Enables guarded call of the proposed 
 * array of async function calls `functs`, with prescribed timeout, number of retires and back-off 
 * on retires.
 * @param label logging label
 * @param functs an array of async functions to be called in form () => function_name()
 * @param timeoutTime timeout to be used 
 * @param numRetries number of retires
 * @param backOffTime back off time on each retry
 * @returns 
 */
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
