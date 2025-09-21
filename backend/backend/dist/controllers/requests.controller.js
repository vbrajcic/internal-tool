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
exports.RequestsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const request_service_1 = require("../services/request.service");
const request_entity_1 = require("../models/request.entity");
const user_entity_1 = require("../models/user.entity");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let RequestsController = class RequestsController {
    constructor(requestService) {
        this.requestService = requestService;
    }
    async getRequests(status, equipmentType, requesterId, teamLeadId, page, limit, req) {
        const currentUser = req.user;
        const filters = {};
        if (status)
            filters.status = status;
        if (equipmentType)
            filters.equipmentType = equipmentType;
        if (requesterId)
            filters.requesterId = requesterId;
        if (teamLeadId)
            filters.teamLeadId = teamLeadId;
        if (currentUser.role === user_entity_1.UserRole.EMPLOYEE) {
            filters.requesterId = currentUser.id;
        }
        else if (currentUser.role === user_entity_1.UserRole.TEAM_LEAD) {
            filters.teamLeadId = currentUser.id;
        }
        const pagination = { page, limit };
        const result = await this.requestService.findAll(filters, pagination, currentUser);
        return {
            requests: result.items,
            pagination: result.pagination,
        };
    }
    async createRequest(createRequestDto, req) {
        const currentUser = req.user;
        return this.requestService.create(createRequestDto, currentUser);
    }
    async getMyRequests(status, page, limit, req) {
        const currentUser = req.user;
        const filters = {
            requesterId: currentUser.id
        };
        if (status)
            filters.status = status;
        const pagination = { page, limit };
        const result = await this.requestService.findAll(filters, pagination, currentUser);
        return {
            requests: result.items,
            pagination: result.pagination,
        };
    }
    async getPendingApprovals(page, limit, req) {
        const currentUser = req.user;
        const pagination = { page, limit };
        const requests = await this.requestService.getPendingApprovals(currentUser);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedRequests = requests.slice(startIndex, endIndex);
        return {
            requests: paginatedRequests,
            pagination: {
                page,
                limit,
                total: requests.length,
                totalPages: Math.ceil(requests.length / limit),
            },
        };
    }
    async getRequestById(id, req) {
        const currentUser = req.user;
        return this.requestService.findById(id, currentUser);
    }
    async updateRequest(id, updateRequestDto, req) {
        const currentUser = req.user;
        return this.requestService.update(id, updateRequestDto, currentUser);
    }
    async teamLeadReview(id, reviewDto, req) {
        const currentUser = req.user;
        return this.requestService.teamLeadReview(id, reviewDto, currentUser);
    }
    async adminReview(id, reviewDto, req) {
        const currentUser = req.user;
        return this.requestService.adminReview(id, reviewDto, currentUser);
    }
    async fulfillRequest(id, fulfillDto, req) {
        const currentUser = req.user;
        return this.requestService.fulfill(id, fulfillDto, currentUser);
    }
    async cancelRequest(id, cancellationData, req) {
        const currentUser = req.user;
        return this.requestService.cancel(id, cancellationData, currentUser);
    }
    async getRequestAnalytics(startDate, endDate, req) {
        const currentUser = req.user;
        const dateRange = {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        };
        return this.requestService.getAnalytics(dateRange, currentUser);
    }
};
exports.RequestsController = RequestsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'List equipment requests',
        description: 'Get equipment requests with role-based filtering and pagination'
    }),
    (0, swagger_1.ApiQuery)({ name: 'status', enum: request_entity_1.RequestStatus, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'equipmentType', enum: request_entity_1.EquipmentType, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'requesterId', type: 'string', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'teamLeadId', type: 'string', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', type: 'number', required: false, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', type: 'number', required: false, example: 20 }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Requests retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                requests: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Request' }
                },
                pagination: { $ref: '#/components/schemas/Pagination' }
            }
        }
    }),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('equipmentType')),
    __param(2, (0, common_1.Query)('requesterId', new common_1.ParseUUIDPipe({ optional: true }))),
    __param(3, (0, common_1.Query)('teamLeadId', new common_1.ParseUUIDPipe({ optional: true }))),
    __param(4, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(5, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(6, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Number, Number, Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "getRequests", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Submit equipment request',
        description: 'Create new equipment request that enters approval workflow'
    }),
    (0, swagger_1.ApiBody)({
        description: 'Equipment request data',
        schema: {
            type: 'object',
            required: ['equipmentType', 'justification'],
            properties: {
                equipmentType: { enum: Object.values(request_entity_1.EquipmentType) },
                justification: { type: 'string' },
                specifications: { type: 'string', description: 'Optional specific requirements' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Request submitted successfully',
        type: request_entity_1.Request
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid request data' }),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "createRequest", null);
__decorate([
    (0, common_1.Get)('my-requests'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get current user requests',
        description: 'Retrieve all requests submitted by the current user'
    }),
    (0, swagger_1.ApiQuery)({ name: 'status', enum: request_entity_1.RequestStatus, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', type: 'number', required: false, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', type: 'number', required: false, example: 20 }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User requests retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                requests: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Request' }
                },
                pagination: { $ref: '#/components/schemas/Pagination' }
            }
        }
    }),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "getMyRequests", null);
__decorate([
    (0, common_1.Get)('pending-approvals'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.TEAM_LEAD, user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Get pending approval requests',
        description: 'Retrieve requests pending approval based on user role'
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', type: 'number', required: false, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', type: 'number', required: false, example: 20 }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Pending requests retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                requests: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Request' }
                },
                pagination: { $ref: '#/components/schemas/Pagination' }
            }
        }
    }),
    __param(0, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "getPendingApprovals", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get request details',
        description: 'Retrieve detailed request information with approval history'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Request details retrieved',
        schema: {
            allOf: [
                { $ref: '#/components/schemas/Request' },
                {
                    type: 'object',
                    properties: {
                        requester: { $ref: '#/components/schemas/UserSummary' },
                        teamLead: { $ref: '#/components/schemas/UserSummary' },
                        admin: { $ref: '#/components/schemas/UserSummary' },
                        equipment: { $ref: '#/components/schemas/EquipmentSummary' }
                    }
                }
            ]
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Request not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "getRequestById", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update request',
        description: 'Update request details (only by requester and before approval)'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, swagger_1.ApiBody)({
        description: 'Request update data',
        schema: {
            type: 'object',
            properties: {
                equipmentType: { enum: Object.values(request_entity_1.EquipmentType) },
                justification: { type: 'string' },
                specifications: { type: 'string' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Request updated successfully',
        type: request_entity_1.Request
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Request cannot be modified' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Request not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "updateRequest", null);
__decorate([
    (0, common_1.Post)(':id/team-lead-review'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.TEAM_LEAD, user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Team lead review',
        description: 'Review request as team lead (first approval stage)'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, swagger_1.ApiBody)({
        description: 'Team lead review data',
        schema: {
            type: 'object',
            required: ['decision'],
            properties: {
                decision: {
                    enum: ['Approved', 'Rejected'],
                    description: 'Team lead decision'
                },
                notes: {
                    type: 'string',
                    description: 'Optional review notes'
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Team lead review completed',
        type: request_entity_1.Request
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid review or request state' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Not authorized to review this request' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "teamLeadReview", null);
__decorate([
    (0, common_1.Post)(':id/admin-review'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Admin review',
        description: 'Review request as admin (final approval stage)'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, swagger_1.ApiBody)({
        description: 'Admin review data',
        schema: {
            type: 'object',
            required: ['decision'],
            properties: {
                decision: {
                    enum: ['Approved', 'Rejected'],
                    description: 'Admin decision'
                },
                notes: {
                    type: 'string',
                    description: 'Optional review notes'
                },
                budgetApproval: {
                    type: 'boolean',
                    description: 'Budget approval flag for expensive equipment'
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Admin review completed',
        type: request_entity_1.Request
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid review or request state' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "adminReview", null);
__decorate([
    (0, common_1.Post)(':id/fulfill'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Fulfill equipment request',
        description: 'Complete request by assigning specific equipment to requester'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, swagger_1.ApiBody)({
        description: 'Fulfillment data',
        schema: {
            type: 'object',
            required: ['equipmentId'],
            properties: {
                equipmentId: {
                    type: 'string',
                    format: 'uuid',
                    description: 'ID of equipment to assign'
                },
                fulfillmentNotes: {
                    type: 'string',
                    description: 'Optional fulfillment notes'
                },
                deliveryInstructions: {
                    type: 'string',
                    description: 'Equipment delivery or pickup instructions'
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Request fulfilled successfully',
        type: request_entity_1.Request
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid fulfillment data or request state' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Request or equipment not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "fulfillRequest", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, swagger_1.ApiOperation)({
        summary: 'Cancel equipment request',
        description: 'Cancel request (by requester or admin)'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, swagger_1.ApiBody)({
        description: 'Cancellation data',
        schema: {
            type: 'object',
            required: ['reason'],
            properties: {
                reason: {
                    type: 'string',
                    description: 'Reason for cancellation'
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Request cancelled successfully',
        type: request_entity_1.Request
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Request cannot be cancelled' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "cancelRequest", null);
__decorate([
    (0, common_1.Get)('analytics/summary'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN, user_entity_1.UserRole.TEAM_LEAD),
    (0, swagger_1.ApiOperation)({
        summary: 'Get request analytics',
        description: 'Retrieve request workflow analytics and statistics'
    }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', type: 'string', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', type: 'string', required: false }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Analytics data retrieved',
        schema: {
            type: 'object',
            properties: {
                totalRequests: { type: 'number' },
                requestsByStatus: {
                    type: 'object',
                    additionalProperties: { type: 'number' }
                },
                requestsByType: {
                    type: 'object',
                    additionalProperties: { type: 'number' }
                },
                averageApprovalTime: {
                    type: 'object',
                    properties: {
                        teamLeadReview: { type: 'number', description: 'Average days for team lead review' },
                        adminReview: { type: 'number', description: 'Average days for admin review' },
                        fulfillment: { type: 'number', description: 'Average days for fulfillment' }
                    }
                },
                approvalRates: {
                    type: 'object',
                    properties: {
                        teamLeadApprovalRate: { type: 'number' },
                        adminApprovalRate: { type: 'number' },
                        overallApprovalRate: { type: 'number' }
                    }
                },
                topRequesters: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            userId: { type: 'string' },
                            userName: { type: 'string' },
                            requestCount: { type: 'number' }
                        }
                    }
                }
            }
        }
    }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "getRequestAnalytics", null);
exports.RequestsController = RequestsController = __decorate([
    (0, swagger_1.ApiTags)('requests'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('api/requests'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [request_service_1.RequestService])
], RequestsController);
//# sourceMappingURL=requests.controller.js.map