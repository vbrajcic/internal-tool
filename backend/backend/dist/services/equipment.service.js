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
exports.EquipmentService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const QRCode = require("qrcode");
const equipment_entity_1 = require("../models/equipment.entity");
const user_entity_1 = require("../models/user.entity");
const transfer_entity_1 = require("../models/transfer.entity");
const audit_log_entity_1 = require("../models/audit-log.entity");
let EquipmentService = class EquipmentService {
    constructor(equipmentRepository, userRepository, transferRepository, auditLogRepository) {
        this.equipmentRepository = equipmentRepository;
        this.userRepository = userRepository;
        this.transferRepository = transferRepository;
        this.auditLogRepository = auditLogRepository;
    }
    async create(equipmentData, currentUser) {
        if (currentUser.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only administrators can register new equipment');
        }
        const existingEquipment = await this.equipmentRepository.findOne({
            where: { serialNumber: equipmentData.serialNumber }
        });
        if (existingEquipment) {
            throw new common_1.ConflictException('Equipment with this serial number already exists');
        }
        const equipment = this.equipmentRepository.create({
            ...equipmentData,
            condition: equipmentData.condition || equipment_entity_1.Condition.NEW,
            status: equipment_entity_1.EquipmentStatus.AVAILABLE,
            currentOwnerId: null,
        });
        const savedEquipment = await this.equipmentRepository.save(equipment);
        const qrCode = await this.generateQRCode(savedEquipment.id);
        const updatedEquipment = await this.equipmentRepository.save({
            ...savedEquipment,
            qrCode,
        });
        await this.createAuditLog('equipment', updatedEquipment.id, currentUser.id, audit_log_entity_1.AuditAction.CREATE, null, {
            serialNumber: updatedEquipment.serialNumber,
            type: updatedEquipment.type,
            brand: updatedEquipment.brand,
            model: updatedEquipment.model,
            qrCode: updatedEquipment.qrCode,
        });
        return this.findById(updatedEquipment.id);
    }
    async findAll(filters = {}, pagination = {}, currentUser) {
        const { page = 1, limit = 20 } = pagination;
        const skip = (page - 1) * limit;
        const whereConditions = {};
        if (currentUser.role === user_entity_1.UserRole.EMPLOYEE) {
            whereConditions.currentOwnerId = currentUser.id;
        }
        if (filters.status) {
            whereConditions.status = filters.status;
        }
        if (filters.type) {
            whereConditions.type = filters.type;
        }
        if (filters.currentOwnerId && currentUser.role !== user_entity_1.UserRole.EMPLOYEE) {
            whereConditions.currentOwnerId = filters.currentOwnerId;
        }
        if (filters.classificationTag) {
            whereConditions.classificationTag = filters.classificationTag;
        }
        if (filters.condition) {
            whereConditions.condition = filters.condition;
        }
        if (filters.brand) {
            whereConditions.brand = filters.brand;
        }
        let queryBuilder = this.equipmentRepository
            .createQueryBuilder('equipment')
            .leftJoinAndSelect('equipment.currentOwner', 'currentOwner')
            .leftJoinAndSelect('equipment.transfers', 'transfers')
            .leftJoinAndSelect('transfers.fromUser', 'fromUser')
            .leftJoinAndSelect('transfers.toUser', 'toUser')
            .where(whereConditions)
            .orderBy('equipment.createdAt', 'DESC')
            .skip(skip)
            .take(limit);
        if (filters.search) {
            queryBuilder = queryBuilder.andWhere('(equipment.brand ILIKE :search OR equipment.model ILIKE :search OR equipment.serialNumber ILIKE :search)', { search: `%${filters.search}%` });
        }
        const [equipment, total] = await queryBuilder.getManyAndCount();
        return {
            items: equipment,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findById(id) {
        const equipment = await this.equipmentRepository.findOne({
            where: { id },
            relations: [
                'currentOwner',
                'transfers',
                'transfers.fromUser',
                'transfers.toUser',
                'requests',
            ],
        });
        if (!equipment) {
            throw new common_1.NotFoundException('Equipment not found');
        }
        return equipment;
    }
    async findByQR(qrCode, currentUser, scanMetadata) {
        const startTime = Date.now();
        const equipment = await this.equipmentRepository.findOne({
            where: { qrCode },
            relations: [
                'currentOwner',
                'transfers',
                'transfers.fromUser',
                'transfers.toUser',
            ],
        });
        if (!equipment) {
            throw new common_1.NotFoundException('Equipment not found for QR code');
        }
        const responseTime = Date.now() - startTime;
        let canReportCondition = false;
        let availableActions = [];
        if (currentUser.role === user_entity_1.UserRole.ADMIN) {
            availableActions = ['view', 'edit', 'transfer', 'reportCondition'];
            canReportCondition = true;
        }
        else if (equipment.currentOwnerId === currentUser.id) {
            availableActions = ['view', 'reportCondition'];
            canReportCondition = true;
        }
        else {
            availableActions = ['view'];
        }
        const scanTimestamp = new Date();
        await this.createAuditLog('equipment_scan', equipment.id, currentUser.id, audit_log_entity_1.AuditAction.CREATE, null, {
            scanSource: scanMetadata?.scanSource || 'unknown',
            userAgent: scanMetadata?.userAgent,
            ip: scanMetadata?.ip,
            responseTime,
        });
        const result = {
            ...equipment,
            mobileOptimized: true,
            availableActions,
            canReportCondition,
            scanLogged: true,
            scanTimestamp,
            responseTime,
        };
        return result;
    }
    async update(id, updateData, currentUser) {
        const equipment = await this.findById(id);
        const oldValues = { ...equipment };
        if (currentUser.role === user_entity_1.UserRole.EMPLOYEE) {
            if (equipment.currentOwnerId !== currentUser.id) {
                throw new common_1.ForbiddenException('You can only update equipment assigned to you');
            }
            const allowedFields = ['condition', 'notes'];
            const updateFields = Object.keys(updateData);
            const unauthorizedFields = updateFields.filter(field => !allowedFields.includes(field));
            if (unauthorizedFields.length > 0) {
                throw new common_1.ForbiddenException(`You can only update: ${allowedFields.join(', ')}`);
            }
        }
        if (updateData.status && updateData.status !== equipment.status) {
            this.validateStatusTransition(equipment.status, updateData.status, currentUser);
        }
        await this.equipmentRepository.update(id, updateData);
        await this.createAuditLog('equipment', id, currentUser.id, audit_log_entity_1.AuditAction.UPDATE, oldValues, updateData);
        return this.findById(id);
    }
    async updateCondition(id, condition, notes, currentUser) {
        const equipment = await this.findById(id);
        if (currentUser.role === user_entity_1.UserRole.EMPLOYEE && equipment.currentOwnerId !== currentUser.id) {
            throw new common_1.ForbiddenException('You can only update condition of equipment assigned to you');
        }
        const oldValues = {
            condition: equipment.condition,
            notes: equipment.notes,
        };
        const updateData = {
            condition,
            notes,
            updatedAt: new Date(),
        };
        await this.equipmentRepository.update(id, updateData);
        await this.createAuditLog('equipment_condition', id, currentUser.id, audit_log_entity_1.AuditAction.UPDATE, oldValues, { condition, notes });
        return this.findById(id);
    }
    async getTransferHistory(id, currentUser) {
        const equipment = await this.findById(id);
        if (currentUser.role === user_entity_1.UserRole.EMPLOYEE) {
            if (equipment.currentOwnerId !== currentUser.id) {
                throw new common_1.ForbiddenException('You can only view transfer history for your own equipment');
            }
        }
        return this.transferRepository.find({
            where: { equipmentId: id },
            relations: ['fromUser', 'toUser'],
            order: { createdAt: 'DESC' },
        });
    }
    async initiateTransfer(equipmentId, transferData, currentUser) {
        if (currentUser.role === user_entity_1.UserRole.EMPLOYEE) {
            throw new common_1.ForbiddenException('Only administrators and team leads can initiate equipment transfers');
        }
        const equipment = await this.findById(equipmentId);
        if (equipment.status === equipment_entity_1.EquipmentStatus.PENDING) {
            throw new common_1.BadRequestException('Equipment is already pending transfer');
        }
        if (equipment.status === equipment_entity_1.EquipmentStatus.BROKEN || equipment.status === equipment_entity_1.EquipmentStatus.STOLEN) {
            throw new common_1.BadRequestException('Cannot transfer equipment in current status');
        }
        if (transferData.toUserId) {
            const targetUser = await this.userRepository.findOne({
                where: { id: transferData.toUserId, isActive: true }
            });
            if (!targetUser) {
                throw new common_1.BadRequestException('Target user not found or inactive');
            }
        }
        const transferType = transfer_entity_1.Transfer.determineTransferType(equipment.currentOwnerId, transferData.toUserId);
        const transfer = this.transferRepository.create({
            equipmentId,
            fromUserId: equipment.currentOwnerId,
            toUserId: transferData.toUserId,
            transferType,
            reason: transferData.reason,
            fromUserConfirmed: false,
            toUserConfirmed: false,
            adminConfirmed: false,
        });
        const savedTransfer = await this.transferRepository.save(transfer);
        await this.equipmentRepository.update(equipmentId, {
            status: equipment_entity_1.EquipmentStatus.PENDING,
        });
        await this.createAuditLog('equipment_transfer', equipmentId, currentUser.id, audit_log_entity_1.AuditAction.CREATE, null, {
            transferId: savedTransfer.id,
            transferType,
            fromUserId: equipment.currentOwnerId,
            toUserId: transferData.toUserId,
            reason: transferData.reason,
        });
        return this.transferRepository.findOne({
            where: { id: savedTransfer.id },
            relations: ['fromUser', 'toUser', 'equipment'],
        });
    }
    async delete(id, currentUser) {
        if (currentUser.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only administrators can delete equipment');
        }
        const equipment = await this.findById(id);
        if (equipment.status === equipment_entity_1.EquipmentStatus.ASSIGNED) {
            throw new common_1.BadRequestException('Cannot delete assigned equipment. Return to pool first.');
        }
        if (equipment.status === equipment_entity_1.EquipmentStatus.PENDING) {
            throw new common_1.BadRequestException('Cannot delete equipment with pending transfers');
        }
        await this.createAuditLog('equipment', id, currentUser.id, audit_log_entity_1.AuditAction.DELETE, {
            serialNumber: equipment.serialNumber,
            type: equipment.type,
            brand: equipment.brand,
            model: equipment.model,
            status: equipment.status,
        }, null);
        await this.equipmentRepository.delete(id);
    }
    async regenerateQRCode(id, currentUser) {
        if (currentUser.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only administrators can regenerate QR codes');
        }
        const equipment = await this.findById(id);
        const oldQrCode = equipment.qrCode;
        const newQrCode = await this.generateQRCode(id);
        await this.equipmentRepository.update(id, {
            qrCode: newQrCode,
            updatedAt: new Date(),
        });
        await this.createAuditLog('equipment_qr', id, currentUser.id, audit_log_entity_1.AuditAction.UPDATE, { qrCode: oldQrCode }, { qrCode: newQrCode });
        return this.findById(id);
    }
    async getEquipmentStats() {
        const [total, available, assigned, pending, broken, stolen, typeStats, conditionStats, classificationStats,] = await Promise.all([
            this.equipmentRepository.count(),
            this.equipmentRepository.count({ where: { status: equipment_entity_1.EquipmentStatus.AVAILABLE } }),
            this.equipmentRepository.count({ where: { status: equipment_entity_1.EquipmentStatus.ASSIGNED } }),
            this.equipmentRepository.count({ where: { status: equipment_entity_1.EquipmentStatus.PENDING } }),
            this.equipmentRepository.count({ where: { status: equipment_entity_1.EquipmentStatus.BROKEN } }),
            this.equipmentRepository.count({ where: { status: equipment_entity_1.EquipmentStatus.STOLEN } }),
            this.equipmentRepository
                .createQueryBuilder('equipment')
                .select('equipment.type', 'type')
                .addSelect('COUNT(*)', 'count')
                .groupBy('equipment.type')
                .getRawMany(),
            this.equipmentRepository
                .createQueryBuilder('equipment')
                .select('equipment.condition', 'condition')
                .addSelect('COUNT(*)', 'count')
                .groupBy('equipment.condition')
                .getRawMany(),
            this.equipmentRepository
                .createQueryBuilder('equipment')
                .select('equipment.classificationTag', 'classificationTag')
                .addSelect('COUNT(*)', 'count')
                .groupBy('equipment.classificationTag')
                .getRawMany(),
        ]);
        const byType = Object.values(equipment_entity_1.EquipmentType).reduce((acc, type) => {
            acc[type] = 0;
            return acc;
        }, {});
        const byCondition = Object.values(equipment_entity_1.Condition).reduce((acc, condition) => {
            acc[condition] = 0;
            return acc;
        }, {});
        const byClassification = Object.values(equipment_entity_1.ClassificationTag).reduce((acc, tag) => {
            acc[tag] = 0;
            return acc;
        }, {});
        typeStats.forEach(stat => {
            byType[stat.type] = parseInt(stat.count);
        });
        conditionStats.forEach(stat => {
            byCondition[stat.condition] = parseInt(stat.count);
        });
        classificationStats.forEach(stat => {
            byClassification[stat.classificationTag] = parseInt(stat.count);
        });
        return {
            total,
            available,
            assigned,
            pending,
            broken,
            stolen,
            byType,
            byCondition,
            byClassification,
        };
    }
    async generateQRCode(equipmentId) {
        try {
            return await QRCode.toDataURL(equipmentId, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF',
                },
            });
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to generate QR code');
        }
    }
    validateStatusTransition(currentStatus, newStatus, currentUser) {
        if (currentUser.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only administrators can change equipment status directly');
        }
        const validTransitions = {
            [equipment_entity_1.EquipmentStatus.AVAILABLE]: [
                equipment_entity_1.EquipmentStatus.ASSIGNED,
                equipment_entity_1.EquipmentStatus.PENDING,
                equipment_entity_1.EquipmentStatus.BROKEN,
                equipment_entity_1.EquipmentStatus.STOLEN,
            ],
            [equipment_entity_1.EquipmentStatus.ASSIGNED]: [
                equipment_entity_1.EquipmentStatus.PENDING,
                equipment_entity_1.EquipmentStatus.BROKEN,
                equipment_entity_1.EquipmentStatus.STOLEN,
            ],
            [equipment_entity_1.EquipmentStatus.PENDING]: [
                equipment_entity_1.EquipmentStatus.AVAILABLE,
                equipment_entity_1.EquipmentStatus.ASSIGNED,
                equipment_entity_1.EquipmentStatus.BROKEN,
                equipment_entity_1.EquipmentStatus.STOLEN,
            ],
            [equipment_entity_1.EquipmentStatus.BROKEN]: [
                equipment_entity_1.EquipmentStatus.AVAILABLE,
                equipment_entity_1.EquipmentStatus.STOLEN,
            ],
            [equipment_entity_1.EquipmentStatus.STOLEN]: [
                equipment_entity_1.EquipmentStatus.AVAILABLE,
            ],
        };
        if (!validTransitions[currentStatus]?.includes(newStatus)) {
            throw new common_1.BadRequestException(`Invalid status transition from ${currentStatus} to ${newStatus}`);
        }
    }
    async createAuditLog(entityType, entityId, userId, action, oldValues, newValues, metadata) {
        const auditLog = this.auditLogRepository.create({
            entityType,
            entityId,
            action,
            userId,
            oldValues,
            newValues,
            metadata,
        });
        await this.auditLogRepository.save(auditLog);
    }
};
exports.EquipmentService = EquipmentService;
exports.EquipmentService = EquipmentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(equipment_entity_1.Equipment)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(transfer_entity_1.Transfer)),
    __param(3, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], EquipmentService);
//# sourceMappingURL=equipment.service.js.map