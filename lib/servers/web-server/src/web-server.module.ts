import { CommonModule } from '@atc/common';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProofController } from './controllers/proof.controller';
import { StatusController } from './controllers/status.controller';
import { ProofEngineService } from './services/proof-engine.service';
import { createTypeOrmOptions } from './utils/db-config';

@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forRootAsync({
      useFactory: async () => createTypeOrmOptions("attester", "web"),
    }),
  ],
  controllers: [ProofController, StatusController],
  providers: [ProofEngineService],
})
export class WebServerModule { }
