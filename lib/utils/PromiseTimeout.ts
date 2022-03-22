import { retry as mccRetry} from "flare-mcc";
import { getGlobalLogger } from "./logger";


// let TIMEOUT_STEP_MULTIPLY = 1.2;
// let BACKOFF_TIME_STEP_MULTIPLY = 1.2;

export async function retry<T>(label: string, funct: (...args:any)=>T, timeoutTime: number=5000, numRetries: number=5, backOddTimeout = 1000): Promise<T> {

    return await mccRetry(
        label,
        funct,
        timeoutTime,
        numRetries,
        backOddTimeout,
        getGlobalLogger().warning,
        getGlobalLogger().debug
    )

    // try {
    //     let result = await Promise.race([funct(), sleepms(timeoutTime)]);

    //     if (result) return result as T;

    //     if (numRetries > 0) {
    //         getGlobalLogger().warning(`retry ^R${label}^^ ${numRetries}`);

    //         await sleepms(backOddTimeout / 2 + getSimpleRandom(backOddTimeout / 2));

    //         return retry(label, funct, timeoutTime * TIMEOUT_STEP_MULTIPLY , numRetries - 1, backOddTimeout * BACKOFF_TIME_STEP_MULTIPLY);
    //     }
    //     else {
    //         getGlobalLogger().warning(`retry ^R${label}^^ failed`);
    //         return null;
    //     }
    // }
    // catch (error) {

    //     if (numRetries > 0) {
    //         getGlobalLogger().warning(`retry ^R${label}^^ exception (retry ${numRetries}) ${error}`);
    //         getGlobalLogger().debug(error.stack);

    //         await sleepms(backOddTimeout / 2 + getSimpleRandom(backOddTimeout / 2));

    //         return retry(label, funct, timeoutTime * TIMEOUT_STEP_MULTIPLY , numRetries - 1, backOddTimeout * BACKOFF_TIME_STEP_MULTIPLY);
    //     }
    //     else {
    //         getGlobalLogger().warning(`retry ^R${label}^^ exception (retry failed) ${error}`);
    //         getGlobalLogger().debug(error.stack);
    //         return null;
    //     }
    // };
}

export async function retryMany(label: string, functs: any[], timeoutTime: number, numRetries: number) {

    // return await mccRetryMany(
    //     label,
    //     functs,
    //     timeoutTime,
    //     numRetries,
    //     1000,
    //     getGlobalLogger().warning,
    //     getGlobalLogger().debug
    // )
    // console.log(functs);
    

    return Promise.all(functs.map(funct => retry(label, funct, timeoutTime, numRetries)));
}
