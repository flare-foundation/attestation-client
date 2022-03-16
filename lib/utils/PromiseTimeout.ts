import { getSimpleRandom } from "flare-mcc";
import { getGlobalLogger } from "./logger";
import { sleepms } from "./utils";

export class PromiseTimeout {

    // static async delay(time: number, val: any) {
    //     return new Promise(resolve => {
    //         setTimeout(resolve.bind(null, val), time);
    //         return null;
    //     });
    // }

    // static async all(promises: Promise<any>[], timeoutTime: number, timeoutVal?: any) {
    //     return Promise.all(promises.map(p => {
    //         return Promise.race([p, this.delay(timeoutTime, timeoutVal)])
    //     }));
    // }

    // static async retry(promise: Promise<any>, timeoutTime: number, retry: number) {
    //     return Promise.race([promise, this.delay(timeoutTime,null)]).then( (result)=>{
    //         if( result ) return result;

    //         if( retry > 0 ) {
    //             getGlobalLogger().warning( `PromiseTimeout::retry ${retry}` );

    //             //reset( promise , promise );

    //             promise.then( (res)=> {
    //                 return PromiseTimeout.retry( res , timeoutTime , retry - 1 );
    //             } );
    //         }
    //         else {
    //             getGlobalLogger().warning( `PromiseTimeout::retry failed` );
    //             return null;
    //         }
    //     } )
    // }

    // static async allRetry(promises: Promise<any>[], timeoutTime: number, retry: number, timeoutVal?: any) {

    //     return Promise.all(promises.map(p => {
    //         return PromiseTimeout.retry(p,timeoutTime, retry);
    //     }));
    // }


    static async delay(milliseconds: number) {
        return new Promise((resolve: any) => {
            setTimeout(() => { resolve(); }, milliseconds);
        });
    }

    static async promiseFunction(funct: any) {
        return new Promise(resolve => { resolve(funct()); });
    }

    static async retry(funct: any, timeoutTime: number, retry: number, backOddTimeout = 1000) {

        try {
            //let result = await Promise.race([PromiseTimeout.promiseFunction(funct), this.delay(timeoutTime)]);
            let result = await Promise.race([funct(), this.delay(timeoutTime)]);

            if (result) return result;

            if (retry > 0) {
                getGlobalLogger().warning(`PromiseTimeout::retry ${retry}`);

                await sleepms(backOddTimeout / 2 + getSimpleRandom(backOddTimeout / 2));

                return PromiseTimeout.retry(funct, timeoutTime, retry - 1, backOddTimeout * 2);
            }
            else {
                getGlobalLogger().warning(`PromiseTimeout::retry failed`);
                return null;
            }
        }
        catch (error) {

            if (retry > 0) {
                getGlobalLogger().warning(`PromiseTimeout::catch.retry ${retry} ${error}`);

                await sleepms(backOddTimeout / 2 + getSimpleRandom(backOddTimeout / 2));

                return PromiseTimeout.retry(funct, timeoutTime, retry - 1, backOddTimeout * 2);
            }
            else {
                getGlobalLogger().warning(`PromiseTimeout::catch.retry failed ${error}`);
                return null;
            }

        };
    }

    static async allRetry(functs: any[], timeoutTime: number, retry: number) {

        return Promise.all(functs.map(funct => PromiseTimeout.retry(funct, timeoutTime, retry)));
    }


}