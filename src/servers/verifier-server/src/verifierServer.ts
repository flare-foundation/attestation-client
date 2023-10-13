import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { WsAdapter } from "@nestjs/platform-ws";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { getGlobalLogger } from "../../../utils/logging/logger";
import { VerifierConfigurationService } from "./services/verifier-configuration.service";
import { VerifierBtcServerModule } from "./verifier-btc-server.module";
import { VerifierDogeServerModule } from "./verifier-doge-server.module";
import { VerifierXrpServerModule } from "./verifier-xrp-server.module";

function moduleForDataSource(): any {
  switch (process.env.VERIFIER_TYPE.toLowerCase()) {
    case "btc":
      return VerifierBtcServerModule
    case "doge":
      return VerifierDogeServerModule
    case "xrp":
      return VerifierXrpServerModule
    default:
      throw new Error(`Wrong verifier type: '${process.env.VERIFIER_TYPE}'`);
  }
}

export async function runVerifierServer() {
  const moduleClass = moduleForDataSource();
  const app = await NestFactory.create(moduleClass);
  app.useWebSocketAdapter(new WsAdapter(app));

  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const verifierType = process.env.VERIFIER_TYPE?.toUpperCase()
  const basePath = process.env.APP_BASE_PATH ? `${process.env.APP_BASE_PATH}/${verifierType}` : `${verifierType}`

  app.setGlobalPrefix(process.env.APP_BASE_PATH ?? "");
  const config = new DocumentBuilder()
    .setTitle(`Verifier and indexer server (${verifierType})`)
    .setDescription("Verifier and indexer server over an indexer database.")
    .setBasePath(basePath)
    .addApiKey({ type: "apiKey", name: "X-API-KEY", in: "header" }, "X-API-KEY")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${basePath}/api-doc`, app, document);

  const logger = getGlobalLogger("web");
  const configurationService = app.get("VERIFIER_CONFIG") as VerifierConfigurationService;

  const port = configurationService.config.port;
  logger.info(`Verifier type: ${configurationService.verifierType}`);

  await app.listen(port, "0.0.0.0", () => logger.info(`Server started listening at http://0.0.0.0:${port}`));

  logger.info(`Websocket server started listening at ws://0.0.0.0:${port}`);
}
