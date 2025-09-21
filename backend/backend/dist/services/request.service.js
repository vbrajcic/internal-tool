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
exports.RequestService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const request_entity_1 = require("../models/request.entity");
const user_entity_1 = require("../models/user.entity");
const team_entity_1 = require("../models/team.entity");
const equipment_entity_1 = require("../models/equipment.entity");
let RequestService = class RequestService {
    constructor(requestRepository, userRepository, teamRepository, equipmentRepository) {
        this.requestRepository = requestRepository;
        this.userRepository = userRepository;
        this.teamRepository = teamRepository;
        this.equipmentRepository = equipmentRepository;
    }
    async create(requestData, requester) {
        if (requestData.justification.length < 10) {
            throw new common_1.BadRequestException('Justification must be at least 10 characters long');
        }
        if (!Object.values(equipment_entity_1.EquipmentType).includes(requestData.equipmentType)) {
            throw new common_1.BadRequestException('Invalid equipment type');
        }
        const requesterWithTeam = await this.userRepository.findOne({
            where: { id: requester.id },
            relations: ['team']
        });
        if (!requesterWithTeam?.team) {
            throw new common_1.BadRequestException('Requester must be assigned to a team');
        }
        const team = await this.teamRepository.findOne({
            where: { id: requesterWithTeam.team.id },
            relations: ['lead']
        });
        if (!team?.lead) {
            throw new common_1.BadRequestException('Team must have an assigned team lead');
        }
        const request = this.requestRepository.create({
            ...requestData,
            requesterId: requester.id,
            teamLeadId: team.lead.id,
            status: request_entity_1.RequestStatus.SUBMITTED,
            teamLeadDecision: request_entity_1.Decision.PENDING,
        });
        const savedRequest = await this.requestRepository.save(request);
        this.simulateNotification(team.lead.email, 'new-request', savedRequest.id);
        return this.findById(savedRequest.id, requester);
    }
    async findAll(filters = {}, pagination = {}, user) {
        const { page = 1, limit = 10 } = pagination;
        const skip = (page - 1) * limit;
        if (page < 1 || limit < 1 || limit > 100) {
            throw new common_1.BadRequestException('Invalid pagination parameters');
        }
        const whereConditions = {};
        if (user.role === user_entity_1.UserRole.EMPLOYEE) {
            whereConditions.requesterId = user.id;
        }
        else if (user.role === user_entity_1.UserRole.TEAM_LEAD) {
            const teamMembers = await this.userRepository.find({
                where: { teamId: user.teamId },
                select: ['id']
            });
            const memberIds = teamMembers.map(member => member.id);
            whereConditions.requesterId = (0, typeorm_2.In)(memberIds);
        }
        if (filters.status) {
            if (!Object.values(request_entity_1.RequestStatus).includes(filters.status)) {
                throw new common_1.BadRequestException('Invalid status filter');
            }
            whereConditions.status = filters.status;
        }
        if (filters.requesterId) {
            if (user.role === user_entity_1.UserRole.EMPLOYEE && filters.requesterId !== user.id) {
                throw new common_1.ForbiddenException('Cannot access other users\' requests');
            }
            whereConditions.requesterId = filters.requesterId;
        }
        if (filters.teamLeadId) {
            whereConditions.teamLeadId = filters.teamLeadId;
        }
        if (filters.equipmentType) {
            if (!Object.values(equipment_entity_1.EquipmentType).includes(filters.equipmentType)) {
                throw new common_1.BadRequestException('Invalid equipment type filter');
            }
            whereConditions.equipmentType = filters.equipmentType;
        }
        const [requests, total] = await this.requestRepository.findAndCount({
            where: whereConditions,
            relations: ['requester', 'teamLead', 'admin', 'equipment'],
            skip,
            take: limit,
            order: {
                requestedAt: 'DESC',
            },
        });
        return {
            items: requests,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findById(id, user) {
        const request = await this.requestRepository.findOne({
            where: { id },
            relations: ['requester', 'teamLead', 'admin', 'equipment'],
        });
        if (!request) {
            throw new common_1.NotFoundException('Request not found');
        }
        if (!this.canAccessRequest(request, user)) {
            throw new common_1.ForbiddenException('Access denied to this request');
        }
        return request;
    }
    async update(id, updateData, user) {
        const request = await this.findById(id, user);
        if (!request.canBeAmended) {
            throw new common_1.BadRequestException('Request cannot be modified in current status');
        }
        if (!this.canModifyRequest(request, user)) {
            throw new common_1.ForbiddenException('Cannot modify this request');
        }
        if (updateData.justification && updateData.justification.length < 10) {
            throw new common_1.BadRequestException('Justification must be at least 10 characters long');
        }
        const updateFields = {};
        if (updateData.justification !== undefined) {
            updateFields.justification = updateData.justification;
        }
        if (updateData.specifications !== undefined) {
            updateFields.specifications = updateData.specifications;
        }
        await this.requestRepository.update(id, updateFields);
        return this.findById(id, user);
    }
    async teamLeadReview(id, reviewData, reviewer) {
        if (reviewer.role !== user_entity_1.UserRole.TEAM_LEAD) {
            throw new common_1.ForbiddenException('Only team leads can perform team lead reviews');
        }
        const request = await this.requestRepository.findOne({
            where: { id },
            relations: ['requester', 'teamLead', 'admin', 'equipment'],
        });
        if (!request) {
            throw new common_1.NotFoundException('Request not found');
        }
        if (request.status !== request_entity_1.RequestStatus.SUBMITTED) {
            throw new common_1.BadRequestException('Request cannot be reviewed in current status');
        }
        if (request.teamLeadId !== reviewer.id) {
            throw new common_1.ForbiddenException('You are not the assigned team lead for this request');
        }
        if (reviewData.decision === request_entity_1.Decision.REJECTED && !reviewData.rejectionReason) {
            throw new common_1.BadRequestException('Rejection reason is required when rejecting');
        }
        if (reviewData.decision === request_entity_1.Decision.APPROVED) {
            request.approveByTeamLead(reviewData.notes);
            this.simulateNotification('admin@company.com', 'admin-review-needed', request.id);
        }
        else if (reviewData.decision === request_entity_1.Decision.REJECTED) {
            request.rejectByTeamLead(reviewData.rejectionReason, reviewData.notes);
            this.simulateNotification(request.requester?.email || '', 'request-rejected', request.id);
        }
        const updatedRequest = await this.requestRepository.save(request);
        return this.findById(updatedRequest.id, reviewer);
    }
    async adminReview(id, reviewData, reviewer) {
        if (reviewer.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only admins can perform admin reviews');
        }
        const request = await this.requestRepository.findOne({
            where: { id },
            relations: ['requester', 'teamLead', 'admin', 'equipment'],
        });
        if (!request) {
            throw new common_1.NotFoundException('Request not found');
        }
        if (request.status !== request_entity_1.RequestStatus.ADMIN_REVIEW) {
            throw new common_1.BadRequestException('Request cannot be reviewed by admin in current status');
        }
        if (reviewData.decision === request_entity_1.Decision.REJECTED && !reviewData.rejectionReason) {
            throw new common_1.BadRequestException('Rejection reason is required when rejecting');
        }
        if (reviewData.decision === request_entity_1.Decision.APPROVED) {
            request.approveByAdmin(reviewer.id, reviewData.notes);
            this.simulateNotification(request.requester?.email || '', 'request-approved', request.id);
        }
        else if (reviewData.decision === request_entity_1.Decision.REJECTED) {
            request.rejectByAdmin(reviewer.id, reviewData.rejectionReason, reviewData.notes);
            this.simulateNotification(request.requester?.email || '', 'request-rejected', request.id);
        }
        const updatedRequest = await this.requestRepository.save(request);
        return this.findById(updatedRequest.id, reviewer);
    }
    async fulfillRequest(id, fulfillmentData, admin) {
        if (admin.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only admins can fulfill requests');
        }
        const request = await this.requestRepository.findOne({
            where: { id },
            relations: ['requester', 'teamLead', 'admin', 'equipment'],
        });
        if (!request) {
            throw new common_1.NotFoundException('Request not found');
        }
        if (request.status !== request_entity_1.RequestStatus.APPROVED) {
            throw new common_1.BadRequestException('Only approved requests can be fulfilled');
        }
        const equipment = await this.equipmentRepository.findOne({
            where: { id: fulfillmentData.equipmentId }
        });
        if (!equipment) {
            throw new common_1.NotFoundException('Equipment not found');
        }
        if (equipment.status !== equipment_entity_1.EquipmentStatus.AVAILABLE) {
            throw new common_1.BadRequestException('Equipment is not available for assignment');
        }
        request.fulfill(fulfillmentData.equipmentId);
        await this.equipmentRepository.update(fulfillmentData.equipmentId, {
            currentOwnerId: request.requesterId,
            status: equipment_entity_1.EquipmentStatus.ASSIGNED,
        });
        const updatedRequest = await this.requestRepository.save(request);
        this.simulateNotification(request.requester?.email || '', 'request-fulfilled', request.id);
        return this.findById(updatedRequest.id, admin);
    }
    async getWorkflowHistory(id, user) {
        const request = await this.findById(id, user);
        const history = [];
        history.push({
            action: 'Request Submitted',
            actor: `${request.requester?.firstName} ${request.requester?.lastName}`,
            timestamp: request.requestedAt,
        });
        if (request.teamLeadReviewedAt) {
            history.push({
                action: 'Team Lead Review',
                actor: `${request.teamLead?.firstName} ${request.teamLead?.lastName}`,
                timestamp: request.teamLeadReviewedAt,
                decision: request.teamLeadDecision,
                notes: request.teamLeadNotes,
            });
        }
        if (request.adminReviewedAt) {
            history.push({
                action: 'Admin Review',
                actor: `${request.admin?.firstName} ${request.admin?.lastName}`,
                timestamp: request.adminReviewedAt,
                decision: request.adminDecision,
                notes: request.adminNotes,
            });
        }
        if (request.fulfilledAt) {
            history.push({
                action: 'Request Fulfilled',
                actor: 'System',
                timestamp: request.fulfilledAt,
                notes: `Equipment assigned: ${request.equipment?.brand} ${request.equipment?.model}`,
            });
        }
        return history.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    async getRequestQueue(role, userId) {
        const whereConditions = {};
        if (role === user_entity_1.UserRole.TEAM_LEAD) {
            whereConditions.teamLeadId = userId;
            whereConditions.status = request_entity_1.RequestStatus.SUBMITTED;
        }
        else if (role === user_entity_1.UserRole.ADMIN) {
            whereConditions.status = request_entity_1.RequestStatus.ADMIN_REVIEW;
        }
        else {
            return [];
        }
        return this.requestRepository.find({
            where: whereConditions,
            relations: ['requester', 'teamLead'],
            order: {
                requestedAt: 'ASC',
            },
        });
    }
    async getRequestStats() {
        const [total, statusStats, processingTimes] = await Promise.all([
            this.requestRepository.count(),
            this.requestRepository
                .createQueryBuilder('request')
                .select('request.status', 'status')
                .addSelect('COUNT(*)', 'count')
                .groupBy('request.status')
                .getRawMany(),
            this.requestRepository
                .createQueryBuilder('request')
                .select('AVG(EXTRACT(epoch FROM (request.teamLeadReviewedAt - request.requestedAt)) / 3600)', 'avgHours')
                .where('request.teamLeadReviewedAt IS NOT NULL')
                .getRawOne(),
        ]);
        const byStatus = {
            [request_entity_1.RequestStatus.SUBMITTED]: 0,
            [request_entity_1.RequestStatus.TEAM_LEAD_REVIEW]: 0,
            [request_entity_1.RequestStatus.ADMIN_REVIEW]: 0,
            [request_entity_1.RequestStatus.APPROVED]: 0,
            [request_entity_1.RequestStatus.REJECTED]: 0,
            [request_entity_1.RequestStatus.ORDERED]: 0,
            [request_entity_1.RequestStatus.FULFILLED]: 0,
            [request_entity_1.RequestStatus.PENDING_TEAM_LEAD_APPROVAL]: 0,
            [request_entity_1.RequestStatus.PENDING_ADMIN_APPROVAL]: 0,
            [request_entity_1.RequestStatus.CANCELLED]: 0,
        };
        statusStats.forEach(stat => {
            byStatus[stat.status] = parseInt(stat.count);
        });
        const pending = byStatus[request_entity_1.RequestStatus.SUBMITTED] + byStatus[request_entity_1.RequestStatus.TEAM_LEAD_REVIEW] + byStatus[request_entity_1.RequestStatus.ADMIN_REVIEW];
        const approved = byStatus[request_entity_1.RequestStatus.APPROVED] + byStatus[request_entity_1.RequestStatus.FULFILLED];
        const rejected = byStatus[request_entity_1.RequestStatus.REJECTED];
        return {
            total,
            pending,
            approved,
            rejected,
            fulfilled: byStatus[request_entity_1.RequestStatus.FULFILLED],
            byStatus,
            avgProcessingTimeHours: parseFloat(processingTimes?.avgHours || '0'),
        };
    }
    async getPendingApprovals(user) {
        let whereConditions = {};
        if (user.role === user_entity_1.UserRole.TEAM_LEAD) {
            whereConditions = {
                teamLeadId: user.id,
                status: request_entity_1.RequestStatus.PENDING_TEAM_LEAD_APPROVAL
            };
        }
        else if (user.role === user_entity_1.UserRole.ADMIN) {
            whereConditions = {
                status: request_entity_1.RequestStatus.PENDING_ADMIN_APPROVAL
            };
        }
        else {
            return [];
        }
        return this.requestRepository.find({
            where: whereConditions,
            relations: ['requester', 'teamLead', 'equipment'],
            order: { requestedAt: 'ASC' }
        });
    }
    async fulfill(id, fulfillmentData, admin) {
        return this.fulfillRequest(id, fulfillmentData, admin);
    }
    async cancel(id, cancellationData, user) {
        const request = await this.findById(id, user);
        if ([request_entity_1.RequestStatus.FULFILLED, request_entity_1.RequestStatus.CANCELLED].includes(request.status)) {
            throw new common_1.BadRequestException('Cannot cancel a request that is already fulfilled or cancelled');
        }
        if (request.requesterId !== user.id && user.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only the requester or admin can cancel a request');
        }
        await this.requestRepository.update(id, {
            status: request_entity_1.RequestStatus.CANCELLED,
            notes: request.notes ? `${request.notes}\n\nCANCELLED: ${cancellationData.reason}` : `CANCELLED: ${cancellationData.reason}`,
            teamLeadReviewedAt: new Date()
        });
        return this.findById(id, user);
    }
    async getAnalytics(dateRange, user) {
        const queryBuilder = this.requestRepository.createQueryBuilder('request');
        if (dateRange.startDate) {
            queryBuilder.andWhere('request.requestedAt >= :startDate', { startDate: dateRange.startDate });
        }
        if (dateRange.endDate) {
            queryBuilder.andWhere('request.requestedAt <= :endDate', { endDate: dateRange.endDate });
        }
        if (user.role === user_entity_1.UserRole.EMPLOYEE) {
            queryBuilder.andWhere('request.requesterId = :userId', { userId: user.id });
        }
        else if (user.role === user_entity_1.UserRole.TEAM_LEAD) {
            queryBuilder.andWhere('(request.requesterId = :userId OR request.teamLeadId = :userId)', { userId: user.id });
        }
        const [requests, total] = await queryBuilder.getManyAndCount();
        const statusCounts = requests.reduce((acc, request) => {
            acc[request.status] = (acc[request.status] || 0) + 1;
            return acc;
        }, {});
        const equipmentTypeCounts = requests.reduce((acc, request) => {
            acc[request.equipmentType] = (acc[request.equipmentType] || 0) + 1;
            return acc;
        }, {});
        const avgProcessingTime = requests.length > 0
            ? requests.reduce((sum, req) => sum + req.processingTimeInHours, 0) / requests.length
            : 0;
        return {
            total,
            statusBreakdown: statusCounts,
            equipmentTypeBreakdown: equipmentTypeCounts,
            averageProcessingTimeHours: avgProcessingTime,
            periodStart: dateRange.startDate,
            periodEnd: dateRange.endDate,
        };
    }
    canAccessRequest(request, user) {
        if (user.role === user_entity_1.UserRole.ADMIN) {
            return true;
        }
        if (user.role === user_entity_1.UserRole.TEAM_LEAD && request.teamLeadId === user.id) {
            return true;
        }
        if (request.requesterId === user.id) {
            return true;
        }
        return false;
    }
    canModifyRequest(request, user) {
        if (user.role === user_entity_1.UserRole.ADMIN) {
            return true;
        }
        if (user.role === user_entity_1.UserRole.TEAM_LEAD && request.teamLeadId === user.id) {
            return true;
        }
        if (request.requesterId === user.id) {
            return true;
        }
        return false;
    }
    simulateNotification(email, type, requestId) {
        console.log(`📧 [SIMULATION] Sending ${type} notification to ${email} for request ${requestId}`);
    }
};
exports.RequestService = RequestService;
exports.RequestService = RequestService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(request_entity_1.Request)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(team_entity_1.Team)),
    __param(3, (0, typeorm_1.InjectRepository)(equipment_entity_1.Equipment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], RequestService);
//# sourceMappingURL=request.service.js.map