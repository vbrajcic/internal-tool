import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Asset Management API',
      version: '1.0.0'
    };
  }

  @Get()
  root() {
    return {
      message: 'Asset Management API is running',
      status: 'healthy',
      endpoints: ['/api/health', '/health'],
      timestamp: new Date().toISOString()
    };
  }
}