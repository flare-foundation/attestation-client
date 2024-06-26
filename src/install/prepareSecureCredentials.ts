// secureCredential
// AttestationSuite tool to create encrypted credential file from credential jsons located in
// ../attestation-suite-config/
// `credentials.json.secure` contains all keys in all .json files in `path` folder (non recursive).
// this file should be copied into target config path.

import fs from "fs";
import path from "path";
import { exit } from "process";
import { getCredentialsKey } from "../utils/config/credentialsKey";
import { readJSONfromFile } from "../utils/config/json";
import { getGlobalLogger } from "../utils/logging/logger";
import { encryptString } from "../utils/security/encrypt";

/**
 * Combine all `.json` files from @param credentialsPath, encrypts them with password from @param passwordAddress and save all in a file @param output.
 * @param credentialsPath
 * @param passwordAddress
 * @param output
 */
export async function prepareSecureCredentials(credentialsPath: string, passwordAddress: string, output: string) {
  const logger = getGlobalLogger();
  logger.group(`secureCredentials ^r${credentialsPath}`);

  const password = await getCredentialsKey();

  if (password.length < 8) {
    logger.error(`password must be at least 8 characters long`);
    exit(2);
  }

  // collect all json credential files from source path folder
  const files = fs.readdirSync(credentialsPath);
  let combinedConfigs = new Object();
  for (const file of files) {
    if (!file.toLowerCase().endsWith("-credentials.json")) {
      continue;
    }
    logger.info(`  loading credentials ^R${file}`);

    const filename = path.join(credentialsPath, file);
    const config = readJSONfromFile<any>(filename, null, true);

    for (const key of Object.keys(config)) {
      if (combinedConfigs[key]) {
        logger.error(`duplicate key '${key}' from '${filename}'`);
        exit(3);
      }
      combinedConfigs[key] = config[key];
    }
  }

  // encrypt and save credentials
  const combinedConfigString = JSON.stringify(combinedConfigs);
  const encryptedConfig = encryptString(password, combinedConfigString);
  fs.writeFileSync(output, encryptedConfig, "utf8");
  logger.info(`secure credentials saved in ^G${output}`);
}
