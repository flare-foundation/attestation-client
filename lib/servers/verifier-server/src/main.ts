import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { getGlobalLogger } from '../../../utils/logger';
import { VerifierConfigurationService } from './services/verifier-configuration.service';
import { VerifierServerModule } from './verifier-server.module';

async function bootstrap() {
  const app = await NestFactory.create(VerifierServerModule);
  app.useWebSocketAdapter(new WsAdapter(app));

  const logger = getGlobalLogger("web");
  const configurationService = app.get(VerifierConfigurationService);

  const port = configurationService.wsServerConfiguration.port;
  logger.info(`Verifier type: ${configurationService.verifierType}`);
  
  await app.listen(port, undefined, () =>
    // tslint:disable-next-line:no-console
    // console.log(`Server started listening at http://localhost:${ port }`)
    logger.info(`Server started listening at http://localhost:${port}`));

    logger.info(`Websocket server started listening at ws://localhost:${port}`);
}
bootstrap();
