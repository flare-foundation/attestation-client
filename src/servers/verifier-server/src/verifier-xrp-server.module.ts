import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule, getEntityManagerToken } from "@nestjs/typeorm";
import { EntityManager } from "typeorm";
import { CommonModule } from "../../common/src";
import { HeaderApiKeyStrategy } from "./auth/auth-header-api-key.strategy";
import { XRPAddressValidityVerifierController } from "./controllers/xrp/xrp-address-validity-verifier.controller";
import { XRPBalanceDecreasingTransactionVerifierController } from "./controllers/xrp/xrp-balance-decreasing-transaction-verifier.controller";
import { XRPConfirmedBlockHeightExistsVerifierController } from "./controllers/xrp/xrp-confirmed-block-height-exists-verifier.controller";
import { XRPIndexerController } from "./controllers/xrp/xrp-indexer.controller";
import { XRPPaymentVerifierController } from "./controllers/xrp/xrp-payment-verifier.controller";
import { XRPReferencedPaymentNonexistenceVerifierController } from "./controllers/xrp/xrp-referenced-payment-nonexistence-verifier.controller";
import { IndexerEngineService } from "./services/indexer-engine.service";
import { VerifierConfigurationService } from "./services/verifier-configuration.service";
import { XRPProcessorService } from "./services/verifier-processors/xrp-processor.service";
import { XRPAddressValidityVerifierService } from "./services/xrp/xrp-address-validity-verifier.service";
import { XRPBalanceDecreasingTransactionVerifierService } from "./services/xrp/xrp-balance-decreasing-transaction-verifier.service";
import { XRPConfirmedBlockHeightExistsVerifierService } from "./services/xrp/xrp-confirmed-block-height-exists-verifier.service";
import { XRPPaymentVerifierService } from "./services/xrp/xrp-payment-verifier.service";
import { XRPReferencedPaymentNonexistenceVerifierService } from "./services/xrp/xrp-referenced-payment-nonexistence-verifier.service";
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
        XRPIndexerController,
        XRPAddressValidityVerifierController,
        XRPBalanceDecreasingTransactionVerifierController,
        XRPConfirmedBlockHeightExistsVerifierController,
        XRPPaymentVerifierController,
        XRPReferencedPaymentNonexistenceVerifierController,
    ],
    providers: [
        {
            provide: "VERIFIER_CONFIG",
            useFactory: async () => {
                const config = new VerifierConfigurationService();
                await config.initialize();
                return config;
            },
        },
        {
            provide: "VERIFIER_PROCESSOR",
            useFactory: async (config: VerifierConfigurationService, manager: EntityManager) => new XRPProcessorService(config, manager),
            inject: [
                { token: "VERIFIER_CONFIG", optional: false },
                { token: getEntityManagerToken("indexerDatabase"), optional: false },
            ],
        },
        IndexerEngineService,
        HeaderApiKeyStrategy,
        XRPAddressValidityVerifierService,
        XRPBalanceDecreasingTransactionVerifierService,
        XRPConfirmedBlockHeightExistsVerifierService,
        XRPPaymentVerifierService,
        XRPReferencedPaymentNonexistenceVerifierService,
    ],
})
export class VerifierXrpServerModule {}
