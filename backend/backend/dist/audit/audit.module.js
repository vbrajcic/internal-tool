"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongodb_1 = require("mongodb");
let AuditModule = class AuditModule {
};
exports.AuditModule = AuditModule;
exports.AuditModule = AuditModule = __decorate([
    (0, common_1.Module)({
        providers: [
            {
                provide: 'MONGODB_CONNECTION',
                useFactory: async (configService) => {
                    const uri = configService.get('MONGODB_URI', 'mongodb://localhost:27017');
                    const client = new mongodb_1.MongoClient(uri, {
                        serverSelectionTimeoutMS: 5000,
                        socketTimeoutMS: 45000,
                        maxPoolSize: 10,
                        minPoolSize: 2,
                    });
                    try {
                        await client.connect();
                        console.log('Connected to MongoDB for audit logging');
                        const db = client.db(configService.get('MONGODB_DB_NAME', 'asset_management_audit'));
                        await db.collection('audit_logs').createIndex({
                            entityType: 1,
                            entityId: 1,
                            timestamp: -1
                        });
                        await db.collection('audit_logs').createIndex({
                            userId: 1,
                            timestamp: -1
                        });
                        return db;
                    }
                    catch (error) {
                        console.error('Failed to connect to MongoDB:', error);
                        throw error;
                    }
                },
                inject: [config_1.ConfigService],
            },
        ],
        exports: ['MONGODB_CONNECTION'],
    })
], AuditModule);
//# sourceMappingURL=audit.module.js.map