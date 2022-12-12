import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { exit } from "process";
import { getGlobalLogger } from "./logger";


/**
 * get secret from the Google Cloud Secret Manager Servis
 * @param name address of the secret
 * @returns 
 */
export async function getSecretPasswordGoogleCloud(name: string) {
    try {
        const client = new SecretManagerServiceClient();
        const [version] = await client.accessSecretVersion({ name });

        const payload = version.payload?.data?.toString();

        if (!payload) {
            getGlobalLogger().error(`GoogleCould: failed to fetch secret "${name}": no payload`)
            exit(501);
            return "";
        }

        return payload
    }
    catch (error) {
        getGlobalLogger().error(`GoogleCould: failed to fetch secret "${name}": ${error}`)
        exit(501);
    }
}

/**
 * get secret password by provider
 * supported providers:
 * - GoogleCloudSecretManager - addres is GoogleCloudSecretManager secret address
 * - direct - addres is plain password *don't use that for anything else but testing*
 * @param provider provider name
 * @param address secret address
 * @returns 
 */
export async function getSecretPasswordByProvider(provider: string, address: string): Promise<string> {
    switch (provider) {
        case "GoogleCloudSecretManager":
            {
                return await getSecretPasswordGoogleCloud(address);
            }
        case "direct":
            {
                getGlobalLogger().warning(`password is not secure`);
                return address;
            }
        default:
            {
                getGlobalLogger().error(`invalid getSecretPassword provider "${provider}"`);
                exit(502);
            }
    }
}

/**
 * get credentials key by address made from provider and addres separated by `:`.
 * 
 * @param address 
 * @returns 
 */
export async function getCredentialsKeyByAddress(address: string) {

    const providerAddress = address.split(':');

    if (providerAddress.length != 2) {
        getGlobalLogger().error(`invalid getCredentialsKeyByAddress address`);
        exit(503);
    }

    return await getSecretPasswordByProvider(providerAddress[0], providerAddress[1]);
}

/**
 * get credentials key from `CREDENTIALS_KEY` env variables. 
 * address is like this:
 * CREDENTIALS_KEY="GoogleCloudSecretManager:projects/flare-network-staging/secrets/data-provider-2_heartbeat-daemon_accountPrivateKey/versions/latest"
 * CREDENTIALS_KEY="direct:testPassword"
 * 
 * @returns 
 */
export async function getCredentialsKey() {
    return await getCredentialsKeyByAddress( process.env.CREDENTIALS_KEY );
}

