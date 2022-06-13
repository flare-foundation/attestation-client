import bodyParser from "body-parser";
import compression from "compression";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express, { NextFunction, Request as ExRequest, Response as ExResponse } from "express";
import helmet from "helmet";
import swaggerUi from 'swagger-ui-express';
import { ValidateError } from "tsoa";
import { RegisterRoutes } from "../../routes/routes";
import swaggerDocument from "../../static/swagger.json";
import { DotEnvExt } from "../utils/DotEnvExt";
import { ApiResponse } from "./models/ApiResponse";

// initialize configuration
// dotenv.config();
DotEnvExt();

export const app = express();

app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(compression()); // Compress all routes

app.use(cookieParser());
app.use(bodyParser.json({ limit: '50mb' }));
// Use body parser to read sent json payloads
app.use(
    bodyParser.urlencoded({
        limit: '50mb',
        extended: true,
        parameterLimit: 50000
    })
);

app.use('/api-doc', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/static', express.static('static'));


RegisterRoutes(app);

app.use(function notFoundHandler(_req, res: ExResponse) {
    res.status(404).send({
        message: "Not Found",
    });
});

app.use(function errorHandler(
    err: unknown,
    req: ExRequest,
    res: ExResponse,
    next: NextFunction
): ExResponse | void {
    if (err instanceof ApiResponse) {
        if (err.errorMessage === 'Error: Invalid credentials') return res.status(401).json(err); // TODO find a better way of doing this
        return res.status(400).json(err);
    }
    if (err instanceof ValidateError) {
        console.warn(`Caught Validation Error for ${req.path}:`, err.fields);
        return res.status(422).json(
            new ApiResponse<any>(undefined, 'VALIDATION_ERROR', undefined, err ? err.fields : null)
        );
    }
    if (err instanceof Error) {
        if ((err as any).status) {
            return res.status((err as any).status).json(
                new ApiResponse<any>(undefined, 'ERROR', err.message)
            );
        }
        return res.status(500).json(
            new ApiResponse<any>(undefined, 'ERROR', err.message)
        );
    }
    next();
});
