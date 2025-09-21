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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../models/user.entity");
const team_entity_1 = require("../models/team.entity");
const equipment_entity_1 = require("../models/equipment.entity");
let UserService = class UserService {
    constructor(userRepository, teamRepository, equipmentRepository) {
        this.userRepository = userRepository;
        this.teamRepository = teamRepository;
        this.equipmentRepository = equipmentRepository;
    }
    async create(userData) {
        const existingUser = await this.userRepository.findOne({
            where: { email: userData.email }
        });
        if (existingUser) {
            throw new common_1.ConflictException('User with this email already exists');
        }
        if (userData.teamId) {
            const team = await this.teamRepository.findOne({
                where: { id: userData.teamId }
            });
            if (!team) {
                throw new common_1.BadRequestException('Team not found');
            }
        }
        const user = this.userRepository.create({
            ...userData,
            isActive: true,
        });
        const savedUser = await this.userRepository.save(user);
        return this.findById(savedUser.id);
    }
    async findAll(filters = {}, pagination = {}) {
        const { page = 1, limit = 10 } = pagination;
        const skip = (page - 1) * limit;
        const whereConditions = {};
        if (filters.role) {
            whereConditions.role = filters.role;
        }
        if (filters.isActive !== undefined) {
            whereConditions.isActive = filters.isActive;
        }
        if (filters.teamId) {
            whereConditions.teamId = filters.teamId;
        }
        const [users, total] = await this.userRepository.findAndCount({
            where: whereConditions,
            relations: ['team', 'assignedEquipment'],
            skip,
            take: limit,
            order: {
                createdAt: 'DESC',
            },
        });
        return {
            items: users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findById(id) {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['team', 'assignedEquipment', 'subscriptions'],
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async update(id, updateData, currentUser) {
        const user = await this.findById(id);
        if (updateData.role && updateData.role !== user.role) {
            if (currentUser.role !== user_entity_1.UserRole.ADMIN) {
                throw new common_1.ForbiddenException('Only administrators can change user roles');
            }
        }
        if (updateData.teamId && updateData.teamId !== user.teamId) {
            const team = await this.teamRepository.findOne({
                where: { id: updateData.teamId }
            });
            if (!team) {
                throw new common_1.BadRequestException('Team not found');
            }
        }
        await this.userRepository.update(id, updateData);
        return this.findById(id);
    }
    async deactivate(id, deactivationData, currentUser) {
        if (currentUser.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only administrators can deactivate users');
        }
        const user = await this.findById(id);
        if (!user.isActive) {
            throw new common_1.BadRequestException('User is already inactive');
        }
        if (deactivationData.transferEquipmentTo) {
            const transferTarget = await this.userRepository.findOne({
                where: {
                    id: deactivationData.transferEquipmentTo,
                    isActive: true
                }
            });
            if (!transferTarget) {
                throw new common_1.BadRequestException('Equipment transfer target user not found or inactive');
            }
        }
        const userEquipment = await this.equipmentRepository.find({
            where: { currentOwnerId: id }
        });
        if (userEquipment.length > 0) {
            if (deactivationData.transferEquipmentTo) {
                await this.equipmentRepository.update({ currentOwnerId: id }, { currentOwnerId: deactivationData.transferEquipmentTo });
            }
            else {
                await this.equipmentRepository.update({ currentOwnerId: id }, {
                    currentOwnerId: null,
                    status: equipment_entity_1.EquipmentStatus.AVAILABLE
                });
            }
        }
        await this.userRepository.update(id, {
            isActive: false,
            updatedAt: new Date(),
        });
        const updatedUser = await this.findById(id);
        updatedUser.equipmentTransferred = userEquipment.length > 0;
        return updatedUser;
    }
    async findByEmail(email) {
        return this.userRepository.findOne({
            where: { email },
            relations: ['team', 'assignedEquipment'],
        });
    }
    async findByAuthId(authId) {
        return this.userRepository.findOne({
            where: { authId: authId },
            relations: ['team', 'assignedEquipment'],
        });
    }
    async isTeamLead(userId, teamId) {
        const user = await this.userRepository.findOne({
            where: { id: userId, role: user_entity_1.UserRole.TEAM_LEAD, teamId, isActive: true }
        });
        return !!user;
    }
    async findOne(id) {
        return this.findById(id);
    }
    async findByTeam(teamId) {
        return this.userRepository.find({
            where: {
                teamId,
                isActive: true
            },
            relations: ['team', 'assignedEquipment'],
            order: {
                firstName: 'ASC',
            },
        });
    }
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    canModifyUser(currentUser, targetUser) {
        if (currentUser.role === user_entity_1.UserRole.ADMIN) {
            return true;
        }
        if (currentUser.role === user_entity_1.UserRole.TEAM_LEAD) {
            return (targetUser.teamId === currentUser.teamId &&
                targetUser.role === user_entity_1.UserRole.EMPLOYEE);
        }
        return currentUser.id === targetUser.id;
    }
    async getUserStats() {
        const [total, active, roleStats] = await Promise.all([
            this.userRepository.count(),
            this.userRepository.count({ where: { isActive: true } }),
            this.userRepository
                .createQueryBuilder('user')
                .select('user.role', 'role')
                .addSelect('COUNT(*)', 'count')
                .groupBy('user.role')
                .getRawMany(),
        ]);
        const byRole = {
            [user_entity_1.UserRole.EMPLOYEE]: 0,
            [user_entity_1.UserRole.TEAM_LEAD]: 0,
            [user_entity_1.UserRole.ADMIN]: 0,
        };
        roleStats.forEach(stat => {
            byRole[stat.role] = parseInt(stat.count);
        });
        return {
            total,
            active,
            inactive: total - active,
            byRole,
        };
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(team_entity_1.Team)),
    __param(2, (0, typeorm_1.InjectRepository)(equipment_entity_1.Equipment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], UserService);
//# sourceMappingURL=user.service.js.map