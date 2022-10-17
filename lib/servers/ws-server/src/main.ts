import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { getGlobalLogger } from '../../../utils/logger';
import { ServerConfigurationService } from '@atc/common';
import { WsServerModule } from './ws-server.module';

async function bootstrap() {
  const app = await NestFactory.create(WsServerModule);
  app.useWebSocketAdapter(new WsAdapter(app));

  const logger = getGlobalLogger("web");
  const configurationService = app.get(ServerConfigurationService);

  let port = configurationService.serverCredentials.port;
  await app.listen(port, undefined, () =>
    // tslint:disable-next-line:no-console
    // console.log(`Server started listening at http://localhost:${ port }`)
    logger.info(`Websocket server started listening at ws://localhost:${configurationService.serverCredentials.port}`));
}
bootstrap();
