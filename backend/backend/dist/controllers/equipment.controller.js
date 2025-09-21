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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EquipmentController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const equipment_service_1 = require("../services/equipment.service");
const equipment_entity_1 = require("../models/equipment.entity");
const transfer_entity_1 = require("../models/transfer.entity");
const user_entity_1 = require("../models/user.entity");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
let EquipmentController = class EquipmentController {
    constructor(equipmentService) {
        this.equipmentService = equipmentService;
    }
    async getEquipment(status, type, ownerId, page = 1, limit = 50, req) {
        const currentUser = req.user;
        const filters = {};
        if (status)
            filters.status = status;
        if (type)
            filters.type = type;
        if (ownerId)
            filters.currentOwnerId = ownerId;
        if (currentUser.role === user_entity_1.UserRole.EMPLOYEE) {
            filters.currentOwnerId = currentUser.id;
        }
        else if (currentUser.role === user_entity_1.UserRole.TEAM_LEAD) {
        }
        const pagination = { page, limit };
        const result = await this.equipmentService.findAll(filters, pagination, currentUser);
        return {
            equipment: result.items,
            pagination: result.pagination,
        };
    }
    async createEquipment(createEquipmentDto, req) {
        const currentUser = req.user;
        return this.equipmentService.create(createEquipmentDto, currentUser);
    }
    async getEquipmentById(id, req) {
        const currentUser = req.user;
        return this.equipmentService.findById(id, currentUser);
    }
    async updateEquipment(id, updateEquipmentDto, req) {
        const currentUser = req.user;
        return this.equipmentService.update(id, updateEquipmentDto, currentUser);
    }
    async transferEquipment(id, transferDto, req) {
        const currentUser = req.user;
        return this.equipmentService.initiateTransfer(id, transferDto, currentUser);
    }
    async getEquipmentByQRCode(qrCode, req) {
        const startTime = Date.now();
        const currentUser = req.user;
        try {
            const equipment = await this.equipmentService.findByQRCode(qrCode, currentUser);
            const responseTime = Date.now() - startTime;
            await this.equipmentService.logQRScan(equipment.id, currentUser.id, responseTime);
            const mobileOptimizedEquipment = {
                ...equipment,
                mobileOptimized: true,
                availableActions: this.getAvailableActions(equipment, currentUser),
                canReportCondition: this.canReportCondition(equipment, currentUser),
                scanLogged: true,
                scanTimestamp: new Date(),
                responseTime,
            };
            if (responseTime > 2000) {
                console.warn(`QR scan exceeded 2s performance requirement: ${responseTime}ms`);
            }
            return mobileOptimizedEquipment;
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            await this.equipmentService.logQRScanFailure(qrCode, currentUser.id, responseTime, error.message);
            throw error;
        }
    }
    async reportCondition(id, conditionData, req) {
        const currentUser = req.user;
        const updateDto = {
            condition: conditionData.condition,
            notes: conditionData.notes,
        };
        return this.equipmentService.update(id, updateDto, currentUser);
    }
    async generateQRCodeImage(id, req) {
        const currentUser = req.user;
        return this.equipmentService.generateQRCodeImage(id, currentUser);
    }
    getAvailableActions(equipment, user) {
        const actions = ['view', 'report_condition'];
        if (equipment.currentOwnerId === user.id) {
            actions.push('transfer');
        }
        if (user.role === user_entity_1.UserRole.ADMIN) {
            actions.push('edit', 'transfer', 'decommission');
        }
        if (user.role === user_entity_1.UserRole.TEAM_LEAD &&
            equipment.currentOwner?.teamId === user.teamId) {
            actions.push('transfer');
        }
        return actions;
    }
    canReportCondition(equipment, user) {
        if (equipment.currentOwnerId === user.id) {
            return true;
        }
        if (user.role === user_entity_1.UserRole.ADMIN) {
            return true;
        }
        if (user.role === user_entity_1.UserRole.TEAM_LEAD &&
            equipment.currentOwner?.teamId === user.teamId) {
            return true;
        }
        return false;
    }
};
exports.EquipmentController = EquipmentController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'List equipment',
        description: 'Get equipment list with filtering and pagination'
    }),
    (0, swagger_1.ApiQuery)({ name: 'status', enum: equipment_entity_1.EquipmentStatus, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'type', enum: equipment_entity_1.EquipmentType, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'ownerId', type: 'string', format: 'uuid', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', type: 'number', required: false, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', type: 'number', required: false, example: 50 }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Equipment list retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                equipment: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Equipment' }
                },
                pagination: { $ref: '#/components/schemas/Pagination' }
            }
        }
    }),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('ownerId', new common_1.ParseUUIDPipe({ optional: true }))),
    __param(3, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(4, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __param(5, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Number, Number, Object]),
    __metadata("design:returntype", Promise)
], EquipmentController.prototype, "getEquipment", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Register new equipment',
        description: 'Create new equipment record with QR code generation'
    }),
    (0, swagger_1.ApiBody)({
        description: 'Equipment creation data',
        schema: {
            type: 'object',
            required: ['serialNumber', 'brand', 'model', 'type', 'purchaseDate', 'classificationTag'],
            properties: {
                serialNumber: { type: 'string' },
                brand: { type: 'string' },
                model: { type: 'string' },
                type: { enum: Object.values(equipment_entity_1.EquipmentType) },
                purchaseDate: { type: 'string', format: 'date' },
                classificationTag: { enum: Object.values(equipment_entity_1.ClassificationTag) },
                condition: { enum: Object.values(equipment_entity_1.Condition), default: 'New' },
                notes: { type: 'string' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Equipment registered successfully',
        type: equipment_entity_1.Equipment
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid request data' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Serial number already exists' }),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EquipmentController.prototype, "createEquipment", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get equipment details',
        description: 'Retrieve equipment with transfer history and current owner'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Equipment details retrieved',
        schema: {
            allOf: [
                { $ref: '#/components/schemas/Equipment' },
                {
                    type: 'object',
                    properties: {
                        currentOwner: { $ref: '#/components/schemas/UserSummary' },
                        transferHistory: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Transfer' }
                        }
                    }
                }
            ]
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Equipment not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EquipmentController.prototype, "getEquipmentById", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update equipment',
        description: 'Update equipment information and status'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiBody)({
        description: 'Equipment update data',
        schema: {
            type: 'object',
            properties: {
                brand: { type: 'string' },
                model: { type: 'string' },
                status: { enum: Object.values(equipment_entity_1.EquipmentStatus) },
                condition: { enum: Object.values(equipment_entity_1.Condition) },
                notes: { type: 'string' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Equipment updated successfully',
        type: equipment_entity_1.Equipment
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Equipment not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], EquipmentController.prototype, "updateEquipment", null);
__decorate([
    (0, common_1.Post)(':id/transfer'),
    (0, swagger_1.ApiOperation)({
        summary: 'Transfer equipment ownership',
        description: 'Initiate equipment transfer with confirmation workflow'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiBody)({
        description: 'Transfer request data',
        schema: {
            type: 'object',
            required: ['reason'],
            properties: {
                toUserId: { type: 'string', format: 'uuid', nullable: true },
                reason: { type: 'string' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Transfer initiated successfully',
        type: transfer_entity_1.Transfer
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid transfer request' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Equipment not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], EquipmentController.prototype, "transferEquipment", null);
__decorate([
    (0, common_1.Get)('qr/:qrCode'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get equipment by QR code',
        description: 'Retrieve equipment information using QR code scan for mobile interface'
    }),
    (0, swagger_1.ApiParam)({ name: 'qrCode', type: 'string', description: 'QR code identifier' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Equipment found by QR code',
        schema: {
            allOf: [
                { $ref: '#/components/schemas/Equipment' },
                {
                    type: 'object',
                    properties: {
                        mobileOptimized: { type: 'boolean' },
                        availableActions: {
                            type: 'array',
                            items: { type: 'string' }
                        },
                        canReportCondition: { type: 'boolean' },
                        scanLogged: { type: 'boolean' },
                        scanTimestamp: { type: 'string', format: 'date-time' },
                        responseTime: { type: 'number', description: 'Response time in milliseconds' }
                    }
                }
            ]
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'QR code not found' }),
    __param(0, (0, common_1.Param)('qrCode')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EquipmentController.prototype, "getEquipmentByQRCode", null);
__decorate([
    (0, common_1.Post)(':id/condition'),
    (0, swagger_1.ApiOperation)({
        summary: 'Report equipment condition',
        description: 'Update equipment condition from mobile interface'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiBody)({
        description: 'Condition report data',
        schema: {
            type: 'object',
            required: ['condition'],
            properties: {
                condition: { enum: Object.values(equipment_entity_1.Condition) },
                notes: { type: 'string', description: 'Optional condition notes' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Condition updated successfully',
        type: equipment_entity_1.Equipment
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], EquipmentController.prototype, "reportCondition", null);
__decorate([
    (0, common_1.Get)(':id/qr-image'),
    (0, swagger_1.ApiOperation)({
        summary: 'Generate QR code image',
        description: 'Generate QR code image for equipment printing'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'QR code image generated',
        schema: {
            type: 'object',
            properties: {
                qrCodeDataUrl: { type: 'string', description: 'Base64 data URL of QR code image' },
                qrCode: { type: 'string', description: 'QR code text value' }
            }
        }
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EquipmentController.prototype, "generateQRCodeImage", null);
exports.EquipmentController = EquipmentController = __decorate([
    (0, swagger_1.ApiTags)('equipment'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('api/equipment'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [equipment_service_1.EquipmentService])
], EquipmentController);
//# sourceMappingURL=equipment.controller.js.map