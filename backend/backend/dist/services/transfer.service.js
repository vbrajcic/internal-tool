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
exports.TransferService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const transfer_entity_1 = require("../models/transfer.entity");
const equipment_entity_1 = require("../models/equipment.entity");
const user_entity_1 = require("../models/user.entity");
const audit_log_entity_1 = require("../models/audit-log.entity");
let TransferService = class TransferService {
    constructor(transferRepository, equipmentRepository, userRepository, auditLogRepository) {
        this.transferRepository = transferRepository;
        this.equipmentRepository = equipmentRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
    }
    async create(transferData, initiator) {
        if (initiator.role === user_entity_1.UserRole.EMPLOYEE) {
            throw new common_1.ForbiddenException('Only administrators and team leads can initiate equipment transfers');
        }
        const equipment = await this.validateEquipmentForTransfer(transferData.equipmentId);
        const { fromUser, toUser } = await this.validateTransferUsers(transferData.fromUserId, transferData.toUserId);
        const transferType = transferData.transferType ||
            transfer_entity_1.Transfer.determineTransferType(transferData.fromUserId, transferData.toUserId);
        await this.validateTransferLogic(equipment, fromUser, toUser, transferType);
        const transfer = this.transferRepository.create({
            equipmentId: transferData.equipmentId,
            fromUserId: transferData.fromUserId,
            toUserId: transferData.toUserId,
            transferType,
            reason: transferData.reason,
            fromUserConfirmed: false,
            toUserConfirmed: false,
            adminConfirmed: false,
        });
        if (initiator.role === user_entity_1.UserRole.ADMIN) {
            transfer.adminConfirmed = true;
        }
        const savedTransfer = await this.transferRepository.save(transfer);
        await this.equipmentRepository.update(transferData.equipmentId, {
            status: equipment_entity_1.EquipmentStatus.PENDING,
        });
        await this.createAuditLog('transfer', savedTransfer.id, initiator.id, audit_log_entity_1.AuditAction.CREATE, null, {
            equipmentId: transferData.equipmentId,
            fromUserId: transferData.fromUserId,
            toUserId: transferData.toUserId,
            transferType,
            reason: transferData.reason,
            initiatedBy: initiator.id,
        });
        await this.checkAndCompleteTransfer(savedTransfer.id);
        return this.findById(savedTransfer.id);
    }
    async findAll(filters = {}, pagination = {}, currentUser) {
        const { page = 1, limit = 20 } = pagination;
        const skip = (page - 1) * limit;
        let whereConditions = {};
        if (currentUser.role === user_entity_1.UserRole.EMPLOYEE) {
            whereConditions = [
                { fromUserId: currentUser.id },
                { toUserId: currentUser.id },
            ];
        }
        let queryBuilder = this.transferRepository
            .createQueryBuilder('transfer')
            .leftJoinAndSelect('transfer.equipment', 'equipment')
            .leftJoinAndSelect('transfer.fromUser', 'fromUser')
            .leftJoinAndSelect('transfer.toUser', 'toUser')
            .orderBy('transfer.createdAt', 'DESC')
            .skip(skip)
            .take(limit);
        if (currentUser.role === user_entity_1.UserRole.EMPLOYEE) {
            queryBuilder = queryBuilder.where('(transfer.fromUserId = :userId OR transfer.toUserId = :userId)', { userId: currentUser.id });
        }
        if (filters.equipmentId) {
            queryBuilder = queryBuilder.andWhere('transfer.equipmentId = :equipmentId', {
                equipmentId: filters.equipmentId,
            });
        }
        if (filters.fromUserId && currentUser.role !== user_entity_1.UserRole.EMPLOYEE) {
            queryBuilder = queryBuilder.andWhere('transfer.fromUserId = :fromUserId', {
                fromUserId: filters.fromUserId,
            });
        }
        if (filters.toUserId && currentUser.role !== user_entity_1.UserRole.EMPLOYEE) {
            queryBuilder = queryBuilder.andWhere('transfer.toUserId = :toUserId', {
                toUserId: filters.toUserId,
            });
        }
        if (filters.transferType) {
            queryBuilder = queryBuilder.andWhere('transfer.transferType = :transferType', {
                transferType: filters.transferType,
            });
        }
        if (filters.status) {
            switch (filters.status) {
                case 'pending':
                    queryBuilder = queryBuilder.andWhere('transfer.transferredAt IS NULL');
                    break;
                case 'completed':
                    queryBuilder = queryBuilder.andWhere('transfer.transferredAt IS NOT NULL');
                    break;
            }
        }
        if (filters.requiresConfirmation) {
            queryBuilder = queryBuilder.andWhere('(transfer.fromUserId IS NOT NULL AND transfer.fromUserConfirmed = false) OR ' +
                '(transfer.toUserId IS NOT NULL AND transfer.toUserConfirmed = false) OR ' +
                'transfer.adminConfirmed = false');
        }
        const [transfers, total] = await queryBuilder.getManyAndCount();
        return {
            items: transfers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findById(id) {
        const transfer = await this.transferRepository.findOne({
            where: { id },
            relations: [
                'equipment',
                'fromUser',
                'toUser',
            ],
        });
        if (!transfer) {
            throw new common_1.NotFoundException('Transfer not found');
        }
        return transfer;
    }
    async confirmTransfer(id, confirmationData, user) {
        const transfer = await this.findById(id);
        if (transfer.isCompleted) {
            throw new common_1.BadRequestException('Transfer is already completed');
        }
        this.validateConfirmationPermission(transfer, confirmationData.confirmationType, user);
        const oldValues = {
            fromUserConfirmed: transfer.fromUserConfirmed,
            toUserConfirmed: transfer.toUserConfirmed,
            adminConfirmed: transfer.adminConfirmed,
        };
        switch (confirmationData.confirmationType) {
            case 'fromUser':
                if (transfer.fromUserConfirmed) {
                    throw new common_1.BadRequestException('Transfer already confirmed by from user');
                }
                transfer.fromUserConfirmed = true;
                break;
            case 'toUser':
                if (transfer.toUserConfirmed) {
                    throw new common_1.BadRequestException('Transfer already confirmed by to user');
                }
                transfer.toUserConfirmed = true;
                break;
            case 'admin':
                if (transfer.adminConfirmed) {
                    throw new common_1.BadRequestException('Transfer already confirmed by admin');
                }
                transfer.adminConfirmed = true;
                break;
        }
        await this.transferRepository.save(transfer);
        await this.createAuditLog('transfer_confirmation', id, user.id, audit_log_entity_1.AuditAction.UPDATE, oldValues, {
            confirmationType: confirmationData.confirmationType,
            notes: confirmationData.notes,
            confirmedBy: user.id,
        });
        await this.checkAndCompleteTransfer(id);
        return this.findById(id);
    }
    async getTransferHistory(equipmentId, currentUser) {
        const equipment = await this.equipmentRepository.findOne({
            where: { id: equipmentId },
        });
        if (!equipment) {
            throw new common_1.NotFoundException('Equipment not found');
        }
        if (currentUser.role === user_entity_1.UserRole.EMPLOYEE) {
            const userTransfers = await this.transferRepository.find({
                where: [
                    { equipmentId, fromUserId: currentUser.id },
                    { equipmentId, toUserId: currentUser.id },
                ],
            });
            if (userTransfers.length === 0 && equipment.currentOwnerId !== currentUser.id) {
                throw new common_1.ForbiddenException('You can only view transfer history for equipment you own or have owned');
            }
        }
        return this.transferRepository.find({
            where: { equipmentId },
            relations: ['fromUser', 'toUser'],
            order: { createdAt: 'DESC' },
        });
    }
    async getPendingTransfers(userId, currentUser) {
        if (currentUser.role === user_entity_1.UserRole.EMPLOYEE && currentUser.id !== userId) {
            throw new common_1.ForbiddenException('You can only view your own pending transfers');
        }
        return this.transferRepository.find({
            where: [
                {
                    fromUserId: userId,
                    fromUserConfirmed: false,
                    transferredAt: (0, typeorm_2.IsNull)(),
                },
                {
                    toUserId: userId,
                    toUserConfirmed: false,
                    transferredAt: (0, typeorm_2.IsNull)(),
                },
            ],
            relations: ['equipment', 'fromUser', 'toUser'],
            order: { createdAt: 'ASC' },
        });
    }
    async completeTransfer(id, currentUser) {
        if (currentUser.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only administrators can manually complete transfers');
        }
        const transfer = await this.findById(id);
        if (transfer.isCompleted) {
            throw new common_1.BadRequestException('Transfer is already completed');
        }
        transfer.transferredAt = new Date();
        await this.transferRepository.save(transfer);
        await this.updateEquipmentOwnership(transfer);
        await this.createAuditLog('transfer_completion', id, currentUser.id, audit_log_entity_1.AuditAction.UPDATE, { transferredAt: null }, {
            transferredAt: transfer.transferredAt,
            completedBy: currentUser.id,
            adminOverride: true,
        });
        return this.findById(id);
    }
    async cancelTransfer(id, cancelData, canceller) {
        const transfer = await this.findById(id);
        if (transfer.isCompleted) {
            throw new common_1.BadRequestException('Cannot cancel completed transfer');
        }
        const canCancel = canceller.role === user_entity_1.UserRole.ADMIN ||
            (canceller.role === user_entity_1.UserRole.TEAM_LEAD && cancelData.adminOverride !== true) ||
            canceller.id === transfer.fromUserId ||
            canceller.id === transfer.toUserId;
        if (!canCancel) {
            throw new common_1.ForbiddenException('You do not have permission to cancel this transfer');
        }
        transfer.fromUserConfirmed = false;
        transfer.toUserConfirmed = false;
        transfer.adminConfirmed = false;
        transfer.reason = `${transfer.reason} | CANCELLED: ${cancelData.reason}`;
        await this.transferRepository.save(transfer);
        await this.equipmentRepository.update(transfer.equipmentId, {
            status: transfer.fromUserId ? equipment_entity_1.EquipmentStatus.ASSIGNED : equipment_entity_1.EquipmentStatus.AVAILABLE,
        });
        await this.createAuditLog('transfer_cancellation', id, canceller.id, audit_log_entity_1.AuditAction.UPDATE, { cancelled: false }, {
            cancelled: true,
            cancellationReason: cancelData.reason,
            cancelledBy: canceller.id,
            adminOverride: cancelData.adminOverride || false,
        });
        return this.findById(id);
    }
    async validateEquipmentForTransfer(equipmentId) {
        const equipment = await this.equipmentRepository.findOne({
            where: { id: equipmentId },
            relations: ['transfers'],
        });
        if (!equipment) {
            throw new common_1.NotFoundException('Equipment not found');
        }
        const pendingTransfer = await this.transferRepository.findOne({
            where: {
                equipmentId,
                transferredAt: (0, typeorm_2.IsNull)(),
            },
        });
        if (pendingTransfer) {
            throw new common_1.ConflictException('Equipment already has a pending transfer');
        }
        if (equipment.status === equipment_entity_1.EquipmentStatus.BROKEN || equipment.status === equipment_entity_1.EquipmentStatus.STOLEN) {
            throw new common_1.BadRequestException(`Cannot transfer equipment with status: ${equipment.status}`);
        }
        return equipment;
    }
    async validateTransferUsers(fromUserId, toUserId) {
        let fromUser = null;
        let toUser = null;
        if (fromUserId) {
            fromUser = await this.userRepository.findOne({
                where: { id: fromUserId, isActive: true },
            });
            if (!fromUser) {
                throw new common_1.BadRequestException('From user not found or inactive');
            }
        }
        if (toUserId) {
            toUser = await this.userRepository.findOne({
                where: { id: toUserId, isActive: true },
            });
            if (!toUser) {
                throw new common_1.BadRequestException('To user not found or inactive');
            }
        }
        return { fromUser, toUser };
    }
    async validateTransferLogic(equipment, fromUser, toUser, transferType) {
        switch (transferType) {
            case transfer_entity_1.TransferType.ASSIGNMENT:
                if (fromUser !== null) {
                    throw new common_1.BadRequestException('Assignment transfers must have fromUserId as null');
                }
                if (!toUser) {
                    throw new common_1.BadRequestException('Assignment transfers must have a valid toUserId');
                }
                if (equipment.status !== equipment_entity_1.EquipmentStatus.AVAILABLE) {
                    throw new common_1.BadRequestException('Can only assign available equipment');
                }
                break;
            case transfer_entity_1.TransferType.RETURN:
                if (!fromUser) {
                    throw new common_1.BadRequestException('Return transfers must have a valid fromUserId');
                }
                if (toUser !== null) {
                    throw new common_1.BadRequestException('Return transfers must have toUserId as null');
                }
                if (equipment.currentOwnerId !== fromUser.id) {
                    throw new common_1.BadRequestException('From user must be the current owner for returns');
                }
                break;
            case transfer_entity_1.TransferType.TRANSFER:
                if (!fromUser || !toUser) {
                    throw new common_1.BadRequestException('Transfers must have both fromUserId and toUserId');
                }
                if (equipment.currentOwnerId !== fromUser.id) {
                    throw new common_1.BadRequestException('From user must be the current owner for transfers');
                }
                break;
            case transfer_entity_1.TransferType.DECOMMISSION:
                if (!fromUser) {
                    throw new common_1.BadRequestException('Decommission transfers must have a valid fromUserId');
                }
                if (toUser !== null) {
                    throw new common_1.BadRequestException('Decommission transfers must have toUserId as null');
                }
                if (equipment.currentOwnerId !== fromUser.id) {
                    throw new common_1.BadRequestException('From user must be the current owner for decommission');
                }
                break;
        }
    }
    validateConfirmationPermission(transfer, confirmationType, user) {
        switch (confirmationType) {
            case 'fromUser':
                if (!transfer.fromUserId) {
                    throw new common_1.BadRequestException('No from user to confirm this transfer');
                }
                if (user.id !== transfer.fromUserId && user.role !== user_entity_1.UserRole.ADMIN) {
                    throw new common_1.ForbiddenException('Only the from user or admin can confirm as from user');
                }
                break;
            case 'toUser':
                if (!transfer.toUserId) {
                    throw new common_1.BadRequestException('No to user to confirm this transfer');
                }
                if (user.id !== transfer.toUserId && user.role !== user_entity_1.UserRole.ADMIN) {
                    throw new common_1.ForbiddenException('Only the to user or admin can confirm as to user');
                }
                break;
            case 'admin':
                if (user.role !== user_entity_1.UserRole.ADMIN) {
                    throw new common_1.ForbiddenException('Only administrators can provide admin confirmation');
                }
                break;
            default:
                throw new common_1.BadRequestException('Invalid confirmation type');
        }
    }
    async checkAndCompleteTransfer(transferId) {
        const transfer = await this.findById(transferId);
        if (transfer.allConfirmationsReceived && !transfer.isCompleted) {
            transfer.transferredAt = new Date();
            await this.transferRepository.save(transfer);
            await this.updateEquipmentOwnership(transfer);
            await this.createAuditLog('transfer_auto_completion', transferId, 'system', audit_log_entity_1.AuditAction.UPDATE, { transferredAt: null }, {
                transferredAt: transfer.transferredAt,
                autoCompleted: true,
            });
        }
    }
    async updateEquipmentOwnership(transfer) {
        const updateData = {};
        switch (transfer.transferType) {
            case transfer_entity_1.TransferType.ASSIGNMENT:
                updateData.currentOwnerId = transfer.toUserId;
                updateData.status = equipment_entity_1.EquipmentStatus.ASSIGNED;
                break;
            case transfer_entity_1.TransferType.RETURN:
                updateData.currentOwnerId = null;
                updateData.status = equipment_entity_1.EquipmentStatus.AVAILABLE;
                break;
            case transfer_entity_1.TransferType.TRANSFER:
                updateData.currentOwnerId = transfer.toUserId;
                updateData.status = equipment_entity_1.EquipmentStatus.ASSIGNED;
                break;
            case transfer_entity_1.TransferType.DECOMMISSION:
                updateData.currentOwnerId = null;
                updateData.status = equipment_entity_1.EquipmentStatus.AVAILABLE;
                break;
        }
        await this.equipmentRepository.update(transfer.equipmentId, updateData);
        await this.createAuditLog('equipment_ownership', transfer.equipmentId, 'system', audit_log_entity_1.AuditAction.UPDATE, {
            currentOwnerId: transfer.transferType === transfer_entity_1.TransferType.ASSIGNMENT ? null : transfer.fromUserId,
            status: equipment_entity_1.EquipmentStatus.PENDING,
        }, updateData);
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
exports.TransferService = TransferService;
exports.TransferService = TransferService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(transfer_entity_1.Transfer)),
    __param(1, (0, typeorm_1.InjectRepository)(equipment_entity_1.Equipment)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(3, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], TransferService);
//# sourceMappingURL=transfer.service.js.map