import { traceManager, TraceManager } from "@flarenetwork/mcc";
import { readConfig, readConfigBase, readCredentials} from "../utils/config";
import { logException } from "../utils/logger";
import { VerificationProviderWebServer } from "./verificationProviderWebServer";
import { globalSettings, VPWSConfig, VPWSCredentials, VPWSSettings } from "./vpwsConfiguration";

async function runVPWS() {
    // setup debug trace
    TraceManager.enabled = false;
    traceManager.displayRuntimeTrace = false;
    traceManager.displayStateOnException = false;
    
    //TraceManager.enabled = true;
    //traceManager.displayRuntimeTrace = true;
    //traceManager.displayStateOnException = true;
  
    // setup retry terminate callback
    //setRetryFailureCallback(terminateOnRetryFailure);
  
    // read configuration
    const config = readConfig(new VPWSConfig(), "vpws");
    const credentials = readCredentials(new VPWSCredentials(), "vpws");


    // read clients
    // todo: this file must be monitored and reloaded if changes so that clients can be added without restart
    const settings = readConfigBase("vpws" , "clients" , undefined , undefined , new VPWSSettings() );
    globalSettings.serverClients = settings.serverClients;
  
    // create and start indexer
    const vpws = new VerificationProviderWebServer(config, credentials);

    return await vpws.runServer();
  }
  
  // set all global loggers to the chain
  //setGlobalLoggerLabel(args["chain"]);
  
  // read .env
  //DotEnvExt();
  
  // indexer entry point
  runVPWS()
    .then(() => process.exit(0))
    .catch((error) => {
      logException(error, `runIndexer`);
      process.exit(1);
    });
