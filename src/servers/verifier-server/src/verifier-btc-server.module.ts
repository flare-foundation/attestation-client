import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule, getEntityManagerToken } from "@nestjs/typeorm";
import { EntityManager } from "typeorm";
import { CommonModule } from "../../common/src";
import { HeaderApiKeyStrategy } from "./auth/auth-header-api-key.strategy";
import { BTCAddressValidityVerifierController } from "./controllers/btc/btc-address-validity-verifier.controller";
import { BTCBalanceDecreasingTransactionVerifierController } from "./controllers/btc/btc-balance-decreasing-transaction-verifier.controller";
import { BTCConfirmedBlockHeightExistsVerifierController } from "./controllers/btc/btc-confirmed-block-height-exists-verifier.controller";
import { BTCIndexerController } from "./controllers/btc/btc-indexer.controller";
import { BTCPaymentVerifierController } from "./controllers/btc/btc-payment-verifier.controller";
import { BTCReferencedPaymentNonexistenceVerifierController } from "./controllers/btc/btc-referenced-payment-nonexistence-verifier.controller";
import { WsServerGateway } from "./gateways/ws-server.gateway";
import { BTCAddressValidityVerifierService } from "./services/btc/btc-address-validity-verifier.service";
import { BTCBalanceDecreasingTransactionVerifierService } from "./services/btc/btc-balance-decreasing-transaction-verifier.service";
import { BTCConfirmedBlockHeightExistsVerifierService } from "./services/btc/btc-confirmed-block-height-exists-verifier.service";
import { BTCPaymentVerifierService } from "./services/btc/btc-payment-verifier.service";
import { BTCReferencedPaymentNonexistenceVerifierService } from "./services/btc/btc-referenced-payment-nonexistence-verifier.service";
import { IndexerEngineService } from "./services/indexer-engine.service";
import { VerifierConfigurationService } from "./services/verifier-configuration.service";
import { BTCProcessorService } from "./services/verifier-processors/btc-processor.service";
import { WsCommandProcessorService } from "./services/ws-command-processor.service";
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
        BTCIndexerController,
        BTCAddressValidityVerifierController,
        BTCBalanceDecreasingTransactionVerifierController,
        BTCConfirmedBlockHeightExistsVerifierController,
        BTCPaymentVerifierController,
        BTCReferencedPaymentNonexistenceVerifierController,
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
            useFactory: async (config: VerifierConfigurationService, manager: EntityManager) => new BTCProcessorService(config, manager),
            inject: [
                { token: "VERIFIER_CONFIG", optional: false },
                { token: getEntityManagerToken("indexerDatabase"), optional: false },
            ],
        },
        WsCommandProcessorService,
        WsServerGateway,
        WsCommandProcessorService,
        IndexerEngineService,
        HeaderApiKeyStrategy,
        BTCAddressValidityVerifierService,
        BTCBalanceDecreasingTransactionVerifierService,
        BTCConfirmedBlockHeightExistsVerifierService,
        BTCPaymentVerifierService,
        BTCReferencedPaymentNonexistenceVerifierService,
    ],
})
export class VerifierBtcServerModule {}
