import { NestFactory } from '@nestjs/core';
import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

@Controller()
class HealthController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Asset Management API is running'
    };
  }

  @Get('equipment')
  getEquipment() {
    return {
      message: 'Equipment endpoint - Mock data',
      data: [
        {
          id: '1',
          serialNumber: 'TEST-001',
          brand: 'Dell',
          model: 'XPS 13',
          type: 'Laptop',
          status: 'Available'
        }
      ]
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [HealthController],
})
class MinimalAppModule {}

async function bootstrap() {
  const app = await NestFactory.create(MinimalAppModule, {
    logger: ['log', 'error', 'warn'],
  });

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  });

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Asset Management API')
    .setDescription('Asset Management System API - Development')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Asset Management API running on: http://localhost:${port}/api`);
  console.log(`📚 API Docs available at: http://localhost:${port}/api/docs`);
  console.log(`❤️  Health check: http://localhost:${port}/api/health`);
}

bootstrap().catch(console.error);