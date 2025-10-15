import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EvaluationsModule } from './modules/evaluations/evaluations.module';
import validateEnv from './config/env.config';
import { CommonModule } from './common/common.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: '.env',
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL'),
        },
      }),
    }),
    CommonModule,

    EvaluationsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
