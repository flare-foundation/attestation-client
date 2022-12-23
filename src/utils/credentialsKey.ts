import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { exit } from "process";
import { getGlobalLogger } from "./logger";

const INVALID_CREDENTIAL_ADDRESS = 501;
const UNKNOWN_SECRET_PROVIDER = 502;
const GOOGLE_CLOUD_SECRET_MANAGER_ERROR = 503;

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
            exit(GOOGLE_CLOUD_SECRET_MANAGER_ERROR);
            return;
        }

        return payload
    }
    catch (error) {
        getGlobalLogger().error(`GoogleCould: failed to fetch secret "${name}": ${error}`)
        exit(GOOGLE_CLOUD_SECRET_MANAGER_ERROR);
        return;
    }
}

/**
 * get secret password by provider
 * supported providers:
 * - GoogleCloudSecretManager - address is GoogleCloudSecretManager secret address
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
                exit(UNKNOWN_SECRET_PROVIDER);
                return;
            }
    }
}

/**
 * Get credentials key by @param address made from provider and address separated by `:`.
 * Address example:
 * -@param address="GoogleCloudSecretManager:projects/flare-network-staging/secrets/data-provider-2_heartbeat-daemon_accountPrivateKey/versions/latest"
 * -@param address="direct:testPassword"
 * 
 * @param address 
 * @returns 
 */
export async function getCredentialsKeyByAddress(address: string) {

    const providerAddress = address.split(':');

    if (providerAddress.length != 2) {
        getGlobalLogger().error(`invalid getCredentialsKeyByAddress address`);
        exit(INVALID_CREDENTIAL_ADDRESS);
        return;
    }

    return await getSecretPasswordByProvider(providerAddress[0], providerAddress[1]);
}

/**
 * get credentials key from `CREDENTIALS_KEY` env variables. 
 * 
 * @returns 
 */
export async function getCredentialsKey() {
    return await getCredentialsKeyByAddress(process.env.CREDENTIALS_KEY);
}

