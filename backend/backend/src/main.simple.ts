import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'error', 'warn'],
    });

    // Enable CORS
    app.enableCors({
      origin: ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // API prefix
    app.setGlobalPrefix('api');

    // Simple Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('Asset Management API')
      .setDescription('Simple Asset Management System API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    // Health check endpoint (Railway requirement)
    app.getHttpAdapter().get('/api/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    });

    // Root health check
    app.getHttpAdapter().get('/health', (req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    const port = process.env.PORT || 3001;
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

    await app.listen(port, host);

    logger.log(`🚀 Application is running on: http://${host}:${port}/api`);
    logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
    logger.log(`❤️  Health Check: http://localhost:${port}/api/health`);
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();