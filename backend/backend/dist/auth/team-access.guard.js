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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamAccessGuard = void 0;
const common_1 = require("@nestjs/common");
const user_service_1 = require("../services/user.service");
const roles_guard_1 = require("./roles.guard");
let TeamAccessGuard = class TeamAccessGuard {
    constructor(userService) {
        this.userService = userService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const { user } = request;
        if (!user) {
            throw new common_1.ForbiddenException('User not authenticated');
        }
        if (user.roles?.includes(roles_guard_1.UserRole.ADMIN)) {
            return true;
        }
        const targetUserId = request.params.userId || request.params.id;
        const teamId = request.params.teamId;
        if (!targetUserId && !teamId) {
            return true;
        }
        try {
            const currentUser = await this.userService.findByAuthId(user.userId);
            if (!currentUser) {
                throw new common_1.ForbiddenException('User not found');
            }
            if (user.roles?.includes(roles_guard_1.UserRole.TEAM_LEAD)) {
                if (teamId) {
                    const isTeamLead = await this.userService.isTeamLead(currentUser.id, teamId);
                    if (isTeamLead) {
                        return true;
                    }
                }
                if (targetUserId) {
                    const targetUser = await this.userService.findOne(targetUserId);
                    if (targetUser && targetUser.teamId === currentUser.teamId) {
                        return true;
                    }
                }
            }
            if (targetUserId === currentUser.id) {
                return true;
            }
            throw new common_1.ForbiddenException('Access denied to this team resource');
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException) {
                throw error;
            }
            throw new common_1.ForbiddenException('Access validation failed');
        }
    }
};
exports.TeamAccessGuard = TeamAccessGuard;
exports.TeamAccessGuard = TeamAccessGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_service_1.UserService])
], TeamAccessGuard);
//# sourceMappingURL=team-access.guard.js.map