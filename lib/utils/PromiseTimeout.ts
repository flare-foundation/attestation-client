import { retry as mccRetry } from "flare-mcc";
import { getGlobalLogger } from "./logger";


let DEFAULT_TIMEOUT = 5000;
let DEFAULT_RETRY = 10;
let DEFAULT_BACK_OFF_TIME = 1000;

let onRetryFailure: (label: string) => void = (label) => { };
export function setRetryFailureCallback(failure: (label: string) => void) {
    onRetryFailure = failure;
}

export async function retry<T>(
    label: string,
    funct: (...args: any) => T,
    timeoutTime: number = DEFAULT_TIMEOUT,
    numRetries: number = DEFAULT_RETRY,
    backOffTime = DEFAULT_BACK_OFF_TIME,
): Promise<T> {

    return await mccRetry(
        label,
        funct,
        timeoutTime,
        numRetries,
        backOffTime,
        getGlobalLogger().warning,
        getGlobalLogger().debug,
        onRetryFailure);
}

export async function retryMany(
    label: string,
    functs: any[],
    timeoutTime: number = DEFAULT_TIMEOUT,
    numRetries: number = DEFAULT_RETRY,
    backOffTime = DEFAULT_BACK_OFF_TIME,
) {
    return Promise.all(functs.map(funct => retry(label, funct, timeoutTime, numRetries, backOffTime)));
}
