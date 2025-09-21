"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const swagger_1 = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    try {
        const app = await core_1.NestFactory.create(app_module_1.AppModule, {
            logger: ['log', 'error', 'warn'],
        });
        app.enableCors({
            origin: ['http://localhost:3000', 'http://localhost:5173'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        });
        app.setGlobalPrefix('api');
        const config = new swagger_1.DocumentBuilder()
            .setTitle('Asset Management API')
            .setDescription('Simple Asset Management System API')
            .setVersion('1.0')
            .addBearerAuth()
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('api/docs', app, document);
        app.getHttpAdapter().get('/api/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });
        const port = process.env.PORT || 3001;
        const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
        await app.listen(port, host);
        logger.log(`🚀 Application is running on: http://${host}:${port}/api`);
        logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
        logger.log(`❤️  Health Check: http://localhost:${port}/api/health`);
    }
    catch (error) {
        logger.error('Failed to start application:', error);
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=main.simple.js.map