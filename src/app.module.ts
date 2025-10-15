import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { EvaluationsModule } from './modules/evaluations/evaluations.module';
import validateEnv from './config/env.config';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: '.env',
    }),
    CommonModule,

    EvaluationsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
