import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { getGlobalLogger } from "../../../utils/logging/logger";
import { ServerConfigurationService } from "./services/server-configuration.service";
import { WebServerModule } from "./web-server.module";

export async function runWebserver() {
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

  app.setGlobalPrefix(process.env.APP_BASE_PATH ?? "");
  const config = new DocumentBuilder()
    .setTitle("Attestation Client Public Server")
    .setBasePath(process.env.APP_BASE_PATH ?? "")
    .setDescription("Public server for attestation client providing data about attestations by round, and attestation status metrics.")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${process.env.APP_BASE_PATH ? process.env.APP_BASE_PATH + "/" : ""}api-doc`, app, document);

  const logger = getGlobalLogger("web");
  const configurationService = app.get("SERVER_CONFIG") as ServerConfigurationService;

  let port = configurationService.serverCredentials.port;
  await app.listen(port, "0.0.0.0", () =>
    logger.info(`Server started listening at http://0.0.0.0:${configurationService.serverCredentials.port}`)
  );
}
