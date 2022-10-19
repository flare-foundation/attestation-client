import { WSServerConfigurationService } from '@atc/common';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { getGlobalLogger } from '../../../utils/logger';
import { WsServerModule } from './ws-server.module';

async function bootstrap() {
  const app = await NestFactory.create(WsServerModule);
  app.useWebSocketAdapter(new WsAdapter(app));

  const logger = getGlobalLogger("web");
  const configurationService = app.get(WSServerConfigurationService);

  let port = configurationService.wsServerConfiguration.port;
  await app.listen(port, undefined, () =>
    // tslint:disable-next-line:no-console
    // console.log(`Server started listening at http://localhost:${ port }`)
    logger.info(`Websocket server started listening at ws://localhost:${configurationService.wsServerConfiguration.port}`));
}
bootstrap();
