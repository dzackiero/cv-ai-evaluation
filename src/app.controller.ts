import { Controller, Get } from '@nestjs/common';
import type { ApiResponse } from './utils/response';
import { successResponse } from './utils/response';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  welcome(): ApiResponse<{ message: string; healthy: boolean }> {
    return successResponse({
      message: 'Welcome to CV AI Evaluation API',
      docs_url: this.configService.get('APP_URL') + '/docs',
      healthy: true,
    });
  }
}
