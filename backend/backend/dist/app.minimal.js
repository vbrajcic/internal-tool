"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
let HealthController = class HealthController {
    health() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            message: 'Asset Management API is running'
        };
    }
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
};
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "health", null);
__decorate([
    (0, common_1.Get)('equipment'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "getEquipment", null);
HealthController = __decorate([
    (0, common_1.Controller)()
], HealthController);
let MinimalAppModule = class MinimalAppModule {
};
MinimalAppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
        ],
        controllers: [HealthController],
    })
], MinimalAppModule);
async function bootstrap() {
    const app = await core_1.NestFactory.create(MinimalAppModule, {
        logger: ['log', 'error', 'warn'],
    });
    app.enableCors({
        origin: ['http://localhost:3000', 'http://localhost:5173'],
        credentials: true,
    });
    app.setGlobalPrefix('api');
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Asset Management API')
        .setDescription('Asset Management System API - Development')
        .setVersion('1.0')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`🚀 Asset Management API running on: http://localhost:${port}/api`);
    console.log(`📚 API Docs available at: http://localhost:${port}/api/docs`);
    console.log(`❤️  Health check: http://localhost:${port}/api/health`);
}
bootstrap().catch(console.error);
//# sourceMappingURL=app.minimal.js.map