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
exports.SimpleEquipmentController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const equipment_service_1 = require("../services/equipment.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
let SimpleEquipmentController = class SimpleEquipmentController {
    constructor(equipmentService) {
        this.equipmentService = equipmentService;
    }
    async findAll(filters) {
        try {
            return await this.equipmentService.findAll(filters, {}, null);
        }
        catch (error) {
            return [];
        }
    }
    async findOne(id) {
        try {
            return await this.equipmentService.findById(id);
        }
        catch (error) {
            throw new Error('Equipment not found');
        }
    }
    async create(createDto) {
        try {
            return await this.equipmentService.create(createDto, null);
        }
        catch (error) {
            throw new Error('Failed to create equipment');
        }
    }
    async update(id, updateDto) {
        try {
            return await this.equipmentService.update(id, updateDto, null);
        }
        catch (error) {
            throw new Error('Failed to update equipment');
        }
    }
    async findByQR(qrCode) {
        try {
            return await this.equipmentService.findByQR(qrCode, null);
        }
        catch (error) {
            throw new Error('Equipment not found');
        }
    }
};
exports.SimpleEquipmentController = SimpleEquipmentController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Get all equipment' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SimpleEquipmentController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Get equipment by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SimpleEquipmentController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Create new equipment' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SimpleEquipmentController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Update equipment' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SimpleEquipmentController.prototype, "update", null);
__decorate([
    (0, common_1.Get)('qr/:qrCode'),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Find equipment by QR code' }),
    __param(0, (0, common_1.Param)('qrCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SimpleEquipmentController.prototype, "findByQR", null);
exports.SimpleEquipmentController = SimpleEquipmentController = __decorate([
    (0, swagger_1.ApiTags)('Equipment'),
    (0, common_1.Controller)('equipment'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [equipment_service_1.EquipmentService])
], SimpleEquipmentController);
//# sourceMappingURL=simple-equipment.controller.js.map