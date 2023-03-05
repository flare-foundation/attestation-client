import { NestFactory } from "@nestjs/core";
import { WsAdapter } from "@nestjs/platform-ws";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { getGlobalLogger } from "../../../utils/logging/logger";
import { VerifierConfigurationService } from "./services/verifier-configuration.service";
import { VerifierServerModule } from "./verifier-server.module";

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

  app.setGlobalPrefix(process.env.APP_BASE_PATH ?? "");
  const config = new DocumentBuilder()
    .setTitle(`Verifier and indexer server (${process.env.VERIFIER_TYPE?.toUpperCase()})`)
    .setDescription("Verifier and indexer server over an indexer database.")
    .setBasePath(process.env.APP_BASE_PATH ?? "")
    .addApiKey({ type: "apiKey", name: "X-API-KEY", in: "header" }, "X-API-KEY")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${process.env.APP_BASE_PATH ? process.env.APP_BASE_PATH + "/" : ""}api-doc`, app, document);

  const logger = getGlobalLogger("web");
  const configurationService = app.get("VERIFIER_CONFIG") as VerifierConfigurationService;

  const port = configurationService.config.port;
  logger.info(`Verifier type: ${configurationService.verifierType}`);

  await app.listen(port, "0.0.0.0", () => logger.info(`Server started listening at http://0.0.0.0:${port}`));

  logger.info(`Websocket server started listening at ws://0.0.0.0:${port}`);
}
