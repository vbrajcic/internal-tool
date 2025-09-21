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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const user_service_1 = require("../services/user.service");
const team_service_1 = require("../services/team.service");
const user_entity_1 = require("../models/user.entity");
const team_entity_1 = require("../models/team.entity");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let UsersController = class UsersController {
    constructor(userService, teamService) {
        this.userService = userService;
        this.teamService = teamService;
    }
    async getUsers(req, page, limit, role, teamId, isActive) {
        const currentUser = req.user;
        const filters = {};
        if (role)
            filters.role = role;
        if (teamId)
            filters.teamId = teamId;
        if (isActive !== undefined)
            filters.isActive = isActive;
        if (currentUser.role === user_entity_1.UserRole.TEAM_LEAD) {
            filters.teamId = currentUser.teamId;
        }
        const pagination = { page, limit };
        const result = await this.userService.findAll(filters, pagination);
        return {
            users: result.items,
            pagination: result.pagination,
        };
    }
    async createUser(createUserDto, req) {
        return this.userService.create(createUserDto);
    }
    async getUserById(id, req) {
        const currentUser = req.user;
        const user = await this.userService.findById(id);
        if (currentUser.role === user_entity_1.UserRole.EMPLOYEE && currentUser.id !== id) {
            throw new common_1.HttpException('Access denied', common_1.HttpStatus.FORBIDDEN);
        }
        if (currentUser.role === user_entity_1.UserRole.TEAM_LEAD &&
            currentUser.teamId !== user.teamId &&
            currentUser.id !== id) {
            throw new common_1.HttpException('Access denied', common_1.HttpStatus.FORBIDDEN);
        }
        return user;
    }
    async updateUser(id, updateUserDto, req) {
        const currentUser = req.user;
        return this.userService.update(id, updateUserDto, currentUser);
    }
    async deactivateUser(id, deactivateDto, req) {
        const currentUser = req.user;
        return this.userService.deactivate(id, deactivateDto, currentUser);
    }
    async getTeams(req) {
        const currentUser = req.user;
        const filters = {};
        const result = await this.teamService.findAll(filters);
        return result.items;
    }
    async createTeam(createTeamDto, req) {
        const currentUser = req.user;
        return this.teamService.create(createTeamDto, currentUser);
    }
    async getTeamById(id, req) {
        const currentUser = req.user;
        const team = await this.teamService.findById(id);
        if (currentUser.role === user_entity_1.UserRole.TEAM_LEAD && currentUser.teamId !== id) {
            throw new common_1.HttpException('Access denied', common_1.HttpStatus.FORBIDDEN);
        }
        return team;
    }
    async updateTeam(id, updateTeamDto, req) {
        const currentUser = req.user;
        return this.teamService.update(id, updateTeamDto, currentUser);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('users'),
    (0, swagger_1.ApiOperation)({
        summary: 'List users',
        description: 'Get users with filtering and role-based visibility'
    }),
    (0, swagger_1.ApiQuery)({ name: 'role', enum: user_entity_1.UserRole, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'teamId', type: 'string', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'isActive', type: 'boolean', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', type: 'number', required: false, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', type: 'number', required: false, example: 10 }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Users retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                users: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/User' }
                },
                pagination: { $ref: '#/components/schemas/Pagination' }
            }
        }
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("page", new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)("limit", new common_1.DefaultValuePipe(10), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)("role")),
    __param(4, (0, common_1.Query)("teamId", new common_1.ParseUUIDPipe({ optional: true }))),
    __param(5, (0, common_1.Query)("isActive", new common_1.ParseBoolPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, Boolean]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Post)('users'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Invite new user',
        description: 'Create new user invitation with role assignment'
    }),
    (0, swagger_1.ApiBody)({
        description: 'User creation data',
        schema: {
            type: 'object',
            required: ['email', 'firstName', 'lastName', 'role'],
            properties: {
                email: { type: 'string', format: 'email' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                role: { enum: Object.values(user_entity_1.UserRole) },
                teamId: { type: 'string' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'User invitation sent successfully',
        type: user_entity_1.User
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid request data' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Email already exists' }),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createUser", null);
__decorate([
    (0, common_1.Get)('users/:id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get user details',
        description: 'Retrieve user with assigned equipment and subscriptions'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User details retrieved',
        type: user_entity_1.User
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUserById", null);
__decorate([
    (0, common_1.Put)('users/:id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update user',
        description: 'Update user profile and role assignment'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, swagger_1.ApiBody)({
        description: 'User update data',
        schema: {
            type: 'object',
            properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                role: { enum: Object.values(user_entity_1.UserRole) },
                teamId: { type: 'string' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User updated successfully',
        type: user_entity_1.User
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Post)('users/:id/deactivate'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Deactivate user (preserve audit trail)',
        description: 'Deactivate user and handle equipment transfer'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, swagger_1.ApiBody)({
        description: 'Deactivation data',
        schema: {
            type: 'object',
            required: ['reason'],
            properties: {
                reason: { type: 'string' },
                transferEquipmentTo: { type: 'string', nullable: true }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User deactivated successfully',
        type: user_entity_1.User
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deactivateUser", null);
__decorate([
    (0, common_1.Get)('teams'),
    (0, swagger_1.ApiOperation)({
        summary: 'List teams',
        description: 'Get all teams with lead information'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Teams retrieved successfully',
        schema: {
            type: 'array',
            items: { $ref: '#/components/schemas/Team' }
        }
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getTeams", null);
__decorate([
    (0, common_1.Post)('teams'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Create team',
        description: 'Create new team with lead assignment'
    }),
    (0, swagger_1.ApiBody)({
        description: 'Team creation data',
        schema: {
            type: 'object',
            required: ['name', 'leadId'],
            properties: {
                name: { type: 'string' },
                leadId: { type: 'string' },
                description: { type: 'string' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Team created successfully',
        type: team_entity_1.Team
    }),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createTeam", null);
__decorate([
    (0, common_1.Get)('teams/:id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get team details',
        description: 'Retrieve team with members and equipment'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Team details retrieved',
        type: team_entity_1.Team
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Team not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getTeamById", null);
__decorate([
    (0, common_1.Put)('teams/:id'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Update team',
        description: 'Update team information and lead assignment'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, swagger_1.ApiBody)({
        description: 'Team update data',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                leadId: { type: 'string' },
                description: { type: 'string' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Team updated successfully',
        type: team_entity_1.Team
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateTeam", null);
exports.UsersController = UsersController = __decorate([
    (0, swagger_1.ApiTags)('users-teams'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('api'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [user_service_1.UserService,
        team_service_1.TeamService])
], UsersController);
//# sourceMappingURL=users.controller.js.map