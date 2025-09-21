"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const swagger_1 = require("@nestjs/swagger");
const validation_pipe_1 = require("./pipes/validation.pipe");
const logging_middleware_1 = require("./middleware/logging.middleware");
const common_1 = require("@nestjs/common");
const helmet_1 = require("helmet");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
            },
        },
        crossOriginEmbedderPolicy: false,
    }));
    app.enableCors({
        origin: [
            process.env.FRONTEND_URL || 'http://localhost:3000',
            'http://localhost:5173',
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    app.use(new logging_middleware_1.LoggingMiddleware().use.bind(new logging_middleware_1.LoggingMiddleware()));
    app.useGlobalPipes(new validation_pipe_1.ValidationPipe());
    app.setGlobalPrefix('api');
    if (process.env.NODE_ENV === 'production') {
        const expressApp = app.getHttpAdapter().getInstance();
        expressApp.set('trust proxy', 1);
    }
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Asset Management API')
        .setDescription('Internal Asset & Subscription Management System API')
        .setVersion('1.0')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
    }, 'JWT-auth')
        .addTag('Authentication', 'User authentication and authorization')
        .addTag('Users', 'User management operations')
        .addTag('Teams', 'Team management operations')
        .addTag('Equipment', 'Equipment tracking and management')
        .addTag('Subscriptions', 'Software subscription management')
        .addTag('Requests', 'Equipment request workflow')
        .addTag('Transfers', 'Equipment transfer operations')
        .addTag('Invoices', 'Invoice and billing management')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });
    const port = process.env.PORT || 3001;
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
    await app.listen(port, host);
    logger.log(`🚀 Application is running on: http://${host}:${port}/api`);
    logger.log(`📚 API Documentation: http://${host}:${port}/api/docs`);
    logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}
bootstrap().catch((error) => {
    const logger = new common_1.Logger('Bootstrap');
    logger.error('Failed to start application:', error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map