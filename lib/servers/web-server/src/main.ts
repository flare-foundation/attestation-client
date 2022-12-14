import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { getGlobalLogger } from '../../../utils/logger';
import { ServerConfigurationService } from '@atc/common';
import { WebServerModule } from './web-server.module';

async function bootstrap() {
  const app = await NestFactory.create(WebServerModule);

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
    .setTitle('Attestation Client Public Server')
    .setDescription('Public server for attestation client providing data about attestations by round, and attestation status metrics.')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-doc', app, document);

  const logger = getGlobalLogger("web");
  const configurationService = app.get(ServerConfigurationService);

  let port = configurationService.serverCredentials.port;
  await app.listen(port, () =>
    // tslint:disable-next-line:no-console
    // console.log(`Server started listening at http://localhost:${ port }`)
    logger.info(`Server started listening at http://localhost:${configurationService.serverCredentials.port}`));
}
bootstrap();

