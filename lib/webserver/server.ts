#!/usr/bin/env node

import { getGlobalLogger } from "../utils/logger";
import { app } from "./app";

const port = process.env.SERVER_PORT

const logger = getGlobalLogger("web");

const server = app.listen(port, () =>
    // tslint:disable-next-line:no-console
    // console.log(`Server started listening at http://localhost:${ port }`)
    logger.info(`Server started listening at http://localhost:${port}`)
);






