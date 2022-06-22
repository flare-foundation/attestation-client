#!/usr/bin/env node

import { getGlobalLogger } from "../utils/logger";
import { app } from "./app";

import { iocContainer } from "./ioc";
import { ConfigurationService } from "./services/configurationService";

const configurationService = iocContainer(null).get(ConfigurationService);

const logger = getGlobalLogger("web");

const server = app.listen(configurationService.serverCredentials.port, () =>
  // tslint:disable-next-line:no-console
  // console.log(`Server started listening at http://localhost:${ port }`)
  logger.info(`Server started listening at http://localhost:${configurationService.serverCredentials.port}`)
);
