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
exports.User = exports.UserRole = void 0;
const typeorm_1 = require("typeorm");
const team_entity_1 = require("./team.entity");
const equipment_entity_1 = require("./equipment.entity");
const subscription_entity_1 = require("./subscription.entity");
const request_entity_1 = require("./request.entity");
var UserRole;
(function (UserRole) {
    UserRole["EMPLOYEE"] = "Employee";
    UserRole["TEAM_LEAD"] = "TeamLead";
    UserRole["ADMIN"] = "Admin";
})(UserRole || (exports.UserRole = UserRole = {}));
let User = class User {
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "authId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: UserRole,
        default: UserRole.EMPLOYEE,
    }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], User.prototype, "teamId", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => team_entity_1.Team, team => team.members),
    (0, typeorm_1.JoinColumn)({ name: 'teamId' }),
    __metadata("design:type", team_entity_1.Team)
], User.prototype, "team", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => equipment_entity_1.Equipment, equipment => equipment.currentOwner),
    __metadata("design:type", Array)
], User.prototype, "assignedEquipment", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => subscription_entity_1.Subscription, subscription => subscription.owner),
    __metadata("design:type", Array)
], User.prototype, "subscriptions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => request_entity_1.Request, request => request.requester),
    __metadata("design:type", Array)
], User.prototype, "requests", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => request_entity_1.Request, request => request.teamLead),
    __metadata("design:type", Array)
], User.prototype, "teamLeadRequests", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => request_entity_1.Request, request => request.admin),
    __metadata("design:type", Array)
], User.prototype, "adminRequests", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users')
], User);
//# sourceMappingURL=user.entity.js.map