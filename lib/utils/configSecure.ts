import { initializeJSONsecure, readJSONsecure } from "./jsonSecure";
import { getGlobalLogger, logException } from "./logger";
import { IReflection } from "./reflection";
import { isEqualType } from "./typeReflection";

const DEFAULT_SECURE_CONFIG_PATH = "../attestation-suite-config";

/**
 * Read secure credentials file and substitude its variables in the template files.
 * 
 * Function creates configutaion object of `obj` and checks if all class members are set.
 * Any unset (non optional) members return error.
 * 
 * Instance class (obj) must be inherited from `IReflection`
 * 
 * Use `SECURE_CONFIG_PATH` env variable to set configuration path if non standard (`../attestation-suite-config`). note that path in this function is absolute (different usage as with the `readConfigBase` function).
 * 
 * Use `SECURE_CONFIG_NETWORK` env variables to specify the network.
 * 
 * @param project project name 
 * @param type configuration type (config, cretentials)
 * @param obj configuration object instance
 * @returns 
 */
async function readSecureConfigBase<T extends IReflection<T>>(project: string, type: string, obj: T = null): Promise<T> {
    let path = ``;

    if (process.env.SECURE_CONFIG_PATH) {
        path = `${process.env.SECURE_CONFIG_PATH}/`;
        getGlobalLogger().debug2(`secure configuration env.SECURE_CONFIG_PATH using ^w^K${process.env.SECURE_CONFIG_PATH}^^`);
    } else {
        const modePath = DEFAULT_SECURE_CONFIG_PATH;
        path = `${modePath}/`;
        getGlobalLogger().warning(`secure configuration path not set. using ^w^K${modePath}^^`);
    }

    let network = "Coston";
    if (process.env.SECURE_CONFIG_NETWORK) {
        network = `${process.env.SECURE_CONFIG_NETWORK}`;
        getGlobalLogger().debug2(`secure configuration env.SECURE_CONFIG_NETWORK using ^w^K${process.env.SECURE_CONFIG_NETWORK}^^`);
    } else {
        getGlobalLogger().warning(`secure configuration network not set. using network ^w^K${network}^^`);
    }

    await initializeJSONsecure(path, network);

    path += `templates/${project}-${type}.json`;

    try {
        const res = readJSONsecure<T>(path);

        const valid = isEqualType(obj.instanciate(), res);

        if (valid) {
            getGlobalLogger().info(`^g^W${project}^^ ^Rsecure^G configuration ^K^w${path}^^ loaded`);
        } else {
            getGlobalLogger().error2(`${project} secure configuration ^K^w${path}^^ has errors`);
        }

        return res;
    } catch (error) {
        logException(error, `${type} file ^K^w${path}^^ load error`);
    }
}

/**
 * Helper class for `readSecureConfigBase` to read `config`.
 * @param obj 
 * @param project 
 * @returns 
 */
export async function readSecureConfig<T extends IReflection<T>>(obj: T, project: string): Promise<T> {
    return await readSecureConfigBase<T>(project, "config", obj);
}

/**
 * Helper class for `readSecureConfigBase` to read `credentials`.
 * [obsolete] This function should be obsolete now. for new project use all configurations in one file and use only `readSecureConfig`.
 * @param obj 
 * @param project 
 * @returns 
 */
export async function readSecureCredentials<T extends IReflection<T>>(obj: T, project: string): Promise<T> {
    return await readSecureConfigBase<T>(project, "credentials", obj);
}


/**
 * Helper class for `readSecureConfigBase` to read `config`.
 * @param obj 
 * @param project 
 * @returns 
 */
 export function readSecureConfigSyn<T extends IReflection<T>>(obj: T, project: string): T {
    let result: T = null;
    let done = false;
    readSecureConfigBase<T>(project, "config", obj).then( (T)=>{
        result = T;
        done = true;
    }).catch( (error)=>{
        logException( error , "readSecureConfigSyn" );
        done = true;
    });

    while( !done ) 
    {
        //???
    }
    return result;


    // return readSecureConfigBase<T>(project, "config", obj)
    // .then(name => {
    //     return name; 
    // });
}

/**
 * Helper class for `readSecureConfigBase` to read `credentials`.
 * [obsolete] This function should be obsolete now. for new project use all configurations in one file and use only `readSecureConfig`.
 * @param obj 
 * @param project 
 * @returns 
 */
export async function readSecureCredentialsSync<T extends IReflection<T>>(obj: T, project: string): Promise<T> {
    return await readSecureConfigBase<T>(project, "credentials", obj);
}

