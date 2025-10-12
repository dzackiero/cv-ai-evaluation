import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

export enum Environment {
  Local = 'local',
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

export enum LogFormat {
  Text = 'text',
  Json = 'json',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsEnum(LogFormat)
  @IsOptional()
  LOG_FORMAT: LogFormat = LogFormat.Text;

  @IsNumber()
  PORT: number;

  @IsString()
  APP_URL: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}

export default validateEnv;
