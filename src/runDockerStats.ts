import { TraceManager, traceManager } from "@flarenetwork/mcc";
import { exit } from "process";
import { DockerStats } from "./monitor/DockerStats";
import { getGlobalLogger, setLoggerName } from "./utils/logging/logger";

traceManager.displayStateOnException = false;
traceManager.displayRuntimeTrace = false;
TraceManager.enabled = false;

const dockerStats = new DockerStats();

setLoggerName("docker-stats");

// allow only one instance of the application
var instanceName = `docker-stats`;

var SingleInstance = require("single-instance");
var locker = new SingleInstance(instanceName);

locker
    .lock()
    .then(function () {
        // eslint-disable-next-line
        dockerStats.runDockerStats();
    })
    .catch(function (err) {
        getGlobalLogger().error(`unable to start application. ^w${instanceName}^^ is locked`);

        // Quit the application
        exit(5);
    });

