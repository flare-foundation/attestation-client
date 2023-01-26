import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { getGlobalLogger } from '../../../utils/logger';
import { VerifierConfigurationService } from './services/verifier-configuration.service';
import { VerifierServerModule } from './verifier-server.module';

export async function runVerifierServer() {
  const app = await NestFactory.create(VerifierServerModule);
  app.useWebSocketAdapter(new WsAdapter(app));

  app.use(helmet());
  // app.use(compression()); // Compress all routes

  app.use(cookieParser());
  app.use(bodyParser.json({ limit: "50mb" }));
  // Use body parser to read sent json payloads
  app.use(
    bodyParser.urlencoded({
      limit: "1mb",
      extended: true,
      parameterLimit: 50000,
    })
  );

  const config = new DocumentBuilder()
    .setTitle('Indexer Server')
    .setDescription('Indexer server over a database on verifier server.')
    .addApiKey({ type: 'apiKey', name: 'X-API-KEY', in: 'header' }, 'X-API-KEY')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-doc', app, document);
  const logger = getGlobalLogger("web");
  const configurationService = app.get("VERIFIER_CONFIG") as VerifierConfigurationService;

  const port = configurationService.config.port;
  logger.info(`Verifier type: ${configurationService.verifierType}`);

  await app.listen(port, undefined, () =>
    // tslint:disable-next-line:no-console
    // console.log(`Server started listening at http://localhost:${ port }`)
    logger.info(`Server started listening at http://localhost:${port}`));

  logger.info(`Websocket server started listening at ws://localhost:${port}`);
}
