import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule, getEntityManagerToken } from "@nestjs/typeorm";
import { EntityManager } from "typeorm";
import { CommonModule } from "../../common/src";
import { HeaderApiKeyStrategy } from "./auth/auth-header-api-key.strategy";
import { DOGEAddressValidityVerifierController } from "./controllers/doge/doge-address-validity-verifier.controller";
import { DOGEBalanceDecreasingTransactionVerifierController } from "./controllers/doge/doge-balance-decreasing-transaction-verifier.controller";
import { DOGEConfirmedBlockHeightExistsVerifierController } from "./controllers/doge/doge-confirmed-block-height-exists-verifier.controller";
import { DOGEIndexerController } from "./controllers/doge/doge-indexer.controller";
import { DOGEPaymentVerifierController } from "./controllers/doge/doge-payment-verifier.controller";
import { DOGEReferencedPaymentNonexistenceVerifierController } from "./controllers/doge/doge-referenced-payment-nonexistence-verifier.controller";
import { DOGEAddressValidityVerifierService } from "./services/doge/doge-address-validity-verifier.service";
import { DOGEBalanceDecreasingTransactionVerifierService } from "./services/doge/doge-balance-decreasing-transaction-verifier.service";
import { DOGEConfirmedBlockHeightExistsVerifierService } from "./services/doge/doge-confirmed-block-height-exists-verifier.service";
import { DOGEPaymentVerifierService } from "./services/doge/doge-payment-verifier.service";
import { DOGEReferencedPaymentNonexistenceVerifierService } from "./services/doge/doge-referenced-payment-nonexistence-verifier.service";
import { ExternalIndexerEngineService } from "./services/external-indexer.service";
import { ExternalDBVerifierConfigurationService } from "./services/verifier-configuration.service";
import { DOGEProcessorService } from "./services/verifier-processors/doge-processor.service";
import { createTypeOrmOptions } from "./utils/db-config";

@Module({
    imports: [
        CommonModule,
        PassportModule,
        TypeOrmModule.forRootAsync({
            name: "indexerDatabase",
            useFactory: async () => createTypeOrmOptions("web"),
        }),
    ],
    controllers: [
        DOGEIndexerController,
        DOGEAddressValidityVerifierController,
        DOGEBalanceDecreasingTransactionVerifierController,
        DOGEConfirmedBlockHeightExistsVerifierController,
        DOGEPaymentVerifierController,
        DOGEReferencedPaymentNonexistenceVerifierController,
    ],
    providers: [
        {
            provide: "VERIFIER_CONFIG",
            useFactory: async () => {
                const config = new ExternalDBVerifierConfigurationService();
                await config.initialize();
                return config;
            },
        },
        {
            provide: "VERIFIER_PROCESSOR",
            useFactory: async (config: ExternalDBVerifierConfigurationService, manager: EntityManager) => new DOGEProcessorService(config, manager),
            inject: [
                { token: "VERIFIER_CONFIG", optional: false },
                { token: getEntityManagerToken("indexerDatabase"), optional: false },
            ],
        },
        ExternalIndexerEngineService,
        HeaderApiKeyStrategy,
        DOGEAddressValidityVerifierService,
        DOGEBalanceDecreasingTransactionVerifierService,
        DOGEConfirmedBlockHeightExistsVerifierService,
        DOGEPaymentVerifierService,
        DOGEReferencedPaymentNonexistenceVerifierService,
    ],
})
export class VerifierDogeServerModule {}
