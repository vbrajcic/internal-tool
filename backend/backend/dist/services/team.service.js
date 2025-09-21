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
exports.TeamService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const team_entity_1 = require("../models/team.entity");
const user_entity_1 = require("../models/user.entity");
const equipment_entity_1 = require("../models/equipment.entity");
let TeamService = class TeamService {
    constructor(teamRepository, userRepository, equipmentRepository) {
        this.teamRepository = teamRepository;
        this.userRepository = userRepository;
        this.equipmentRepository = equipmentRepository;
    }
    async create(teamData, currentUser) {
        const existingTeam = await this.teamRepository.findOne({
            where: { name: teamData.name }
        });
        if (existingTeam) {
            throw new common_1.ConflictException('Team with this name already exists');
        }
        const teamLead = await this.userRepository.findOne({
            where: { id: teamData.leadId, isActive: true }
        });
        if (!teamLead) {
            throw new common_1.BadRequestException('Team lead not found or inactive');
        }
        if (teamLead.role !== user_entity_1.UserRole.TEAM_LEAD && teamLead.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.BadRequestException('Team lead must have TeamLead or Admin role');
        }
        const team = this.teamRepository.create({
            name: teamData.name,
            leadId: teamData.leadId,
            description: teamData.description,
        });
        const savedTeam = await this.teamRepository.save(team);
        return this.findById(savedTeam.id);
    }
    async findAll(filters = {}, pagination = {}, currentUser) {
        const { page = 1, limit = 10 } = pagination;
        const skip = (page - 1) * limit;
        const whereConditions = {};
        if (filters.leadId) {
            whereConditions.leadId = filters.leadId;
        }
        if (currentUser?.role === user_entity_1.UserRole.TEAM_LEAD) {
            whereConditions.leadId = currentUser.id;
        }
        const queryBuilder = this.teamRepository.createQueryBuilder('team')
            .leftJoinAndSelect('team.lead', 'lead')
            .leftJoinAndSelect('team.members', 'members')
            .skip(skip)
            .take(limit)
            .orderBy('team.createdAt', 'DESC');
        if (Object.keys(whereConditions).length > 0) {
            Object.entries(whereConditions).forEach(([key, value], index) => {
                if (index === 0) {
                    queryBuilder.where(`team.${key} = :${key}`, { [key]: value });
                }
                else {
                    queryBuilder.andWhere(`team.${key} = :${key}`, { [key]: value });
                }
            });
        }
        const [teams, total] = await queryBuilder.getManyAndCount();
        return {
            items: teams,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findById(id, currentUser) {
        const team = await this.teamRepository.findOne({
            where: { id },
            relations: ['lead', 'members', 'members.assignedEquipment'],
        });
        if (!team) {
            throw new common_1.NotFoundException('Team not found');
        }
        if (currentUser?.role === user_entity_1.UserRole.TEAM_LEAD && team.leadId !== currentUser.id) {
            throw new common_1.ForbiddenException('Access denied: You can only view your own team details');
        }
        return team;
    }
    async update(id, updateData, currentUser) {
        const team = await this.findById(id);
        if (updateData.name && updateData.name !== team.name) {
            const existingTeam = await this.teamRepository.findOne({
                where: { name: updateData.name }
            });
            if (existingTeam) {
                throw new common_1.ConflictException('Team with this name already exists');
            }
        }
        if (updateData.leadId && updateData.leadId !== team.leadId) {
            const newLead = await this.userRepository.findOne({
                where: { id: updateData.leadId, isActive: true }
            });
            if (!newLead) {
                throw new common_1.BadRequestException('New team lead not found or inactive');
            }
            if (newLead.role !== user_entity_1.UserRole.TEAM_LEAD && newLead.role !== user_entity_1.UserRole.ADMIN) {
                throw new common_1.BadRequestException('Team lead must have TeamLead or Admin role');
            }
        }
        await this.teamRepository.update(id, {
            ...updateData,
            updatedAt: new Date(),
        });
        return this.findById(id);
    }
    async delete(id) {
        const team = await this.findById(id);
        const activeMembers = await this.userRepository.count({
            where: {
                teamId: id,
                isActive: true
            }
        });
        if (activeMembers > 0) {
            throw new common_1.BadRequestException('Cannot delete team with active members. Please reassign members first.');
        }
        await this.teamRepository.delete(id);
    }
    async setLead(teamId, leadId) {
        const team = await this.findById(teamId);
        const newLead = await this.userRepository.findOne({
            where: { id: leadId, isActive: true }
        });
        if (!newLead) {
            throw new common_1.BadRequestException('Team lead not found or inactive');
        }
        if (newLead.role !== user_entity_1.UserRole.TEAM_LEAD && newLead.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.BadRequestException('Team lead must have TeamLead or Admin role');
        }
        await this.teamRepository.update(teamId, {
            leadId,
            updatedAt: new Date(),
        });
        return this.findById(teamId);
    }
    async getMembers(teamId, currentUser) {
        await this.findById(teamId, currentUser);
        return this.userRepository.find({
            where: {
                teamId,
                isActive: true
            },
            relations: ['assignedEquipment'],
            order: {
                firstName: 'ASC',
                lastName: 'ASC',
            },
        });
    }
    async findByLead(leadId) {
        return this.teamRepository.find({
            where: { leadId },
            relations: ['members', 'lead'],
            order: {
                name: 'ASC',
            },
        });
    }
    canAccessTeam(currentUser, team) {
        if (currentUser.role === user_entity_1.UserRole.ADMIN) {
            return true;
        }
        if (currentUser.role === user_entity_1.UserRole.TEAM_LEAD) {
            return team.leadId === currentUser.id;
        }
        return currentUser.teamId === team.id;
    }
    async getTeamStats() {
        const [total, withLeads, memberStats] = await Promise.all([
            this.teamRepository.count(),
            this.teamRepository
                .createQueryBuilder('team')
                .where('team.leadId IS NOT NULL')
                .getCount(),
            this.teamRepository
                .createQueryBuilder('team')
                .leftJoin('team.members', 'member', 'member.isActive = :isActive', { isActive: true })
                .select('team.name', 'teamName')
                .addSelect('COUNT(member.id)', 'memberCount')
                .groupBy('team.id')
                .addGroupBy('team.name')
                .orderBy('COUNT(member.id)', 'DESC')
                .getRawMany(),
        ]);
        const totalMembers = memberStats.reduce((sum, stat) => sum + parseInt(stat.memberCount), 0);
        const avgMembersPerTeam = total > 0 ? totalMembers / total : 0;
        return {
            total,
            withLeads,
            withoutLeads: total - withLeads,
            avgMembersPerTeam: Math.round(avgMembersPerTeam * 100) / 100,
            memberDistribution: memberStats.map(stat => ({
                teamName: stat.teamName,
                memberCount: parseInt(stat.memberCount)
            })),
        };
    }
    validateTeamName(name) {
        return name && name.trim().length >= 2 && name.trim().length <= 100;
    }
    async getTeamEquipment(teamId, currentUser) {
        await this.findById(teamId, currentUser);
        const members = await this.getMembers(teamId, currentUser);
        if (members.length === 0) {
            return [];
        }
        const memberIds = members.map(member => member.id);
        if (memberIds.length === 0) {
            return [];
        }
        return this.equipmentRepository
            .createQueryBuilder('equipment')
            .leftJoinAndSelect('equipment.currentOwner', 'owner')
            .where('equipment.currentOwnerId IN (:...memberIds)', { memberIds })
            .orderBy('equipment.name', 'ASC')
            .getMany();
    }
    async reassignMembers(fromTeamId, toTeamId) {
        const [fromTeam, toTeam] = await Promise.all([
            this.findById(fromTeamId),
            this.findById(toTeamId),
        ]);
        await this.userRepository.update({
            teamId: fromTeamId,
            isActive: true
        }, {
            teamId: toTeamId,
            updatedAt: new Date(),
        });
    }
};
exports.TeamService = TeamService;
exports.TeamService = TeamService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(team_entity_1.Team)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(equipment_entity_1.Equipment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], TeamService);
//# sourceMappingURL=team.service.js.map