import { traceManager, TraceManager } from "@flarenetwork/mcc";
import { readConfig, readConfigBase, readCredentials } from "../utils/config";
import { logException } from "../utils/logger";
import { VPWSConfig, VPWSCredentials, VPWSProtocols as VPWSProviders, VPWSUsers } from "./vpwsConfiguration";
import { VerificationProviderWebServer } from "./vpwsServer";
import { globalSettings } from "./vpwsSettings";


/**
 * Run VP WebServer
 * @returns 
 */

async function runVPWS() {
  // setup debug trace
  TraceManager.enabled = false;
  traceManager.displayRuntimeTrace = false;
  traceManager.displayStateOnException = false;

  //TraceManager.enabled = true;
  //traceManager.displayRuntimeTrace = true;
  //traceManager.displayStateOnException = true;

  // read configuration
  const config = readConfig(new VPWSConfig(), "vpws");
  const credentials = readCredentials(new VPWSCredentials(), "vpws");


  // read clients
  // todo: this file must be monitored and reloaded if changes so that clients can be added without restart
  const users = readConfigBase("vpws", "users", undefined, undefined, new VPWSUsers());
  globalSettings.createUsers(users);

  // read protocols
  const providers = readConfigBase("vpws", "providers", undefined, undefined, new VPWSProviders());
  await globalSettings.createProviders(providers);

  // create and start indexer
  const vpws = new VerificationProviderWebServer(config, credentials);

  return await vpws.runServer();
}

/**
 * VPWS entry point
 */
runVPWS()
  .then(() => process.exit(0))
  .catch((error) => {
    logException(error, `runVPWS`);
    process.exit(1);
  });
