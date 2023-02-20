import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import fs from "fs";
import { exit } from "process";
import { getGlobalLogger } from "../logging/logger";

const INVALID_CREDENTIAL_ADDRESS = 501;
const UNKNOWN_SECRET_PROVIDER = 502;
const GOOGLE_CLOUD_SECRET_MANAGER_ERROR = 503;
const ERROR_LOADING_CREDENTIALS_KEY = 504;


const DEFAULT_CREDENTIAL_KEY_FILENAME = "../attestation-suite-config/credentials.key";

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
        case "GoogleCloudSecretManager": {
            return await getSecretPasswordGoogleCloud(address);
        }
        case "direct": {
            getGlobalLogger().warning(`password is not secure`);
            return address;
        }
        default: {
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
 * read credential address from file. it uses only first line.
 * @param filename 
 * @returns 
 */
function readAddressFromFile(filename: string): string {
    const data = fs.readFileSync(filename).toString();
    const dataLines = data.split(/\r?\n/);
    return dataLines[0];
}

/**
 * get raw credentials key from 
 * (1) `CREDENTIALS_KEY` env
 * (2) load from `CREDENTIALS_KEY_FILE` env variables file
 * (3) load from `../attesttation-suite-config/credential.key` 
 * 
 * @returns 
 */
export function getCredentialsKeyAddress(): string {
    try {
        if (process.env.CREDENTIALS_KEY) {
            getGlobalLogger().debug(`CredentialsKeyAddress using CREDENTIALS_KEY env`);
            return process.env.CREDENTIALS_KEY;
        } else if (process.env.CREDENTIALS_KEY_FILE) {
            getGlobalLogger().debug(`CredentialsKeyAddress using CREDENTIALS_KEY_FILE ('${process.env.CREDENTIALS_KEY_FILE}') env file`);
            return readAddressFromFile(process.env.CREDENTIALS_KEY_FILE);
        } else {
            getGlobalLogger().debug(`CredentialsKeyAddress using default '${DEFAULT_CREDENTIAL_KEY_FILENAME}' file`);
            return readAddressFromFile(DEFAULT_CREDENTIAL_KEY_FILENAME);
        }
    } catch (error) {
        getGlobalLogger().error(`error loading CredentialsKey`);
        exit(ERROR_LOADING_CREDENTIALS_KEY);
    }
}

/**
 * get credentials key 
 * @returns 
 */
export async function getCredentialsKey(): Promise<string> {
    return await getCredentialsKeyByAddress(getCredentialsKeyAddress());
}

