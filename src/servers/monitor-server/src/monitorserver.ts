import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { getGlobalLogger } from '../../../utils/logging/logger';
import { MonitorServerModule } from './monitor-server.module';
import { ServerConfigurationService } from './services/server-configuration.service';

export async function runMonitorserver() {
  const app = await NestFactory.create(MonitorServerModule);

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

  app.setGlobalPrefix(process.env.APP_BASE_PATH ?? '');
  const config = new DocumentBuilder()
    .setTitle('Attestation Suite Prometheus Monitor Server')
    .setBasePath(process.env.APP_BASE_PATH ?? '')
    .setDescription('Public server for Attestation Suite Prometheus Monitor metrics.')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${process.env.APP_BASE_PATH ? process.env.APP_BASE_PATH + '/' : ''}api-doc`, app, document);

  const logger = getGlobalLogger("web");
  const configurationService = app.get("SERVER_CONFIG") as ServerConfigurationService;

  let port = configurationService.serverCredentials.prometheus.monitorServerPort;
  await app.listen(port, "0.0.0.0", () =>
    // tslint:disable-next-line:no-console
    // console.log(`Server started listening at http://localhost:${ port }`)
    logger.info(`Server started listening at http://0.0.0.0:${configurationService.serverCredentials.prometheus.monitorServerPort}`));
}
