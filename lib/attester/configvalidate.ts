import { AlertConfig } from "../alerts/AlertsConfiguration";
import { ChainsConfiguration } from "../chain/ChainConfiguration";
import { IndexerConfiguration, IndexerCredentials } from "../indexer/IndexerConfiguration";
import { SpammerCredentials } from "../spammer/SpammerConfiguration";
import { readConfig, readCredentials } from "../utils/config";
import { getGlobalLogger } from "../utils/logger";
import { ServerCredentials } from "../webserver/services/configurationService";
import { AttesterClientConfiguration, AttesterCredentials } from "./AttesterClientConfiguration";

function configValidate() {

    getGlobalLogger().title( `configuration verification` );

    // attester-client
    getGlobalLogger().group( `attester-client configuration` );
    readConfig(new AttesterClientConfiguration(), "attester");
    readCredentials(new AttesterCredentials(), "attester");

    // chains
    getGlobalLogger().group( `chains configuration` );
    readConfig(new ChainsConfiguration(), "chains");

    // indexer
    getGlobalLogger().group( `indexer configuration` );
    readConfig(new IndexerConfiguration(), "indexer");
    readCredentials(new IndexerCredentials(), "indexer");

    // alerts
    getGlobalLogger().group( `alerts configuration` );
    readConfig(new AlertConfig(), "alerts");

    // spammer
    getGlobalLogger().group( `spammer configuration` );
    readCredentials(new SpammerCredentials(), "spammer");    
    
    // backend
    getGlobalLogger().group( `backend configuration` );
    readCredentials(new ServerCredentials(), "backend");
}

configValidate();