import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { getGlobalLogger } from '../../../utils/logger';
import { IndexerServerConfigurationService } from './services/indexer-server-configuration.service';
import { IndexerServerModule } from './indexer-server.module';

export async function runIndexerServer() {
  const app = await NestFactory.create(IndexerServerModule);

  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );
  // app.use(compression()); // Compress all routes

  app.use(cookieParser());
  app.use(bodyParser.json({ limit: "50mb" }));
  // Use body parser to read sent json payloads
  app.use(
    bodyParser.urlencoded({
      limit: "50mb",
      extended: true,
      parameterLimit: 50000,
    })
  );

  const config = new DocumentBuilder()
    .setTitle('Indexer Server')
    .setDescription('Indexer server over a database on verifier server.')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-doc', app, document);

  const logger = getGlobalLogger("web");
  const configurationService = app.get("SERVER_CONFIG") as IndexerServerConfigurationService;

  let port = configurationService.serverCredentials.port;
  await app.listen(port, () =>
    // tslint:disable-next-line:no-console
    // console.log(`Server started listening at http://localhost:${ port }`)
    logger.info(`Server started listening at http://localhost:${configurationService.serverCredentials.port}`));
}