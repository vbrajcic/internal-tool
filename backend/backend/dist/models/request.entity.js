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
exports.Request = exports.Decision = exports.RequestStatus = exports.EquipmentType = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const equipment_entity_1 = require("./equipment.entity");
Object.defineProperty(exports, "EquipmentType", { enumerable: true, get: function () { return equipment_entity_1.EquipmentType; } });
var RequestStatus;
(function (RequestStatus) {
    RequestStatus["SUBMITTED"] = "Submitted";
    RequestStatus["TEAM_LEAD_REVIEW"] = "TeamLeadReview";
    RequestStatus["ADMIN_REVIEW"] = "AdminReview";
    RequestStatus["PENDING_TEAM_LEAD_APPROVAL"] = "PendingTeamLeadApproval";
    RequestStatus["PENDING_ADMIN_APPROVAL"] = "PendingAdminApproval";
    RequestStatus["APPROVED"] = "Approved";
    RequestStatus["REJECTED"] = "Rejected";
    RequestStatus["CANCELLED"] = "Cancelled";
    RequestStatus["ORDERED"] = "Ordered";
    RequestStatus["FULFILLED"] = "Fulfilled";
})(RequestStatus || (exports.RequestStatus = RequestStatus = {}));
var Decision;
(function (Decision) {
    Decision["APPROVED"] = "Approved";
    Decision["REJECTED"] = "Rejected";
    Decision["PENDING"] = "Pending";
})(Decision || (exports.Decision = Decision = {}));
let Request = class Request {
    get isApproved() {
        return this.status === RequestStatus.APPROVED;
    }
    get isRejected() {
        return this.status === RequestStatus.REJECTED;
    }
    get isPending() {
        return [
            RequestStatus.SUBMITTED,
            RequestStatus.TEAM_LEAD_REVIEW,
            RequestStatus.ADMIN_REVIEW,
        ].includes(this.status);
    }
    get canBeAmended() {
        return this.status === RequestStatus.SUBMITTED;
    }
    get nextApprover() {
        if (this.status === RequestStatus.SUBMITTED)
            return 'team-lead';
        if (this.status === RequestStatus.TEAM_LEAD_REVIEW && this.teamLeadDecision === Decision.APPROVED) {
            return 'admin';
        }
        return null;
    }
    get processingTimeInHours() {
        const now = new Date();
        const start = new Date(this.requestedAt);
        return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60));
    }
    approveByTeamLead(notes) {
        if (this.status !== RequestStatus.SUBMITTED) {
            throw new Error('Request cannot be approved in current status');
        }
        this.teamLeadDecision = Decision.APPROVED;
        this.teamLeadNotes = notes;
        this.teamLeadReviewedAt = new Date();
        this.status = RequestStatus.ADMIN_REVIEW;
    }
    rejectByTeamLead(reason, notes) {
        if (this.status !== RequestStatus.SUBMITTED) {
            throw new Error('Request cannot be rejected in current status');
        }
        this.teamLeadDecision = Decision.REJECTED;
        this.rejectionReason = reason;
        this.teamLeadNotes = notes;
        this.teamLeadReviewedAt = new Date();
        this.status = RequestStatus.REJECTED;
    }
    approveByAdmin(adminId, notes) {
        if (this.status !== RequestStatus.ADMIN_REVIEW) {
            throw new Error('Request cannot be approved by admin in current status');
        }
        this.adminId = adminId;
        this.adminDecision = Decision.APPROVED;
        this.adminNotes = notes;
        this.adminReviewedAt = new Date();
        this.status = RequestStatus.APPROVED;
    }
    rejectByAdmin(adminId, reason, notes) {
        if (this.status !== RequestStatus.ADMIN_REVIEW) {
            throw new Error('Request cannot be rejected by admin in current status');
        }
        this.adminId = adminId;
        this.adminDecision = Decision.REJECTED;
        this.rejectionReason = reason;
        this.adminNotes = notes;
        this.adminReviewedAt = new Date();
        this.status = RequestStatus.REJECTED;
    }
    fulfill(equipmentId) {
        if (this.status !== RequestStatus.APPROVED) {
            throw new Error('Only approved requests can be fulfilled');
        }
        this.equipmentId = equipmentId;
        this.fulfilledAt = new Date();
        this.status = RequestStatus.FULFILLED;
    }
};
exports.Request = Request;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Request.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Request.prototype, "requesterId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: equipment_entity_1.EquipmentType,
    }),
    __metadata("design:type", String)
], Request.prototype, "equipmentType", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], Request.prototype, "justification", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Request.prototype, "specifications", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: RequestStatus,
        default: RequestStatus.SUBMITTED,
    }),
    __metadata("design:type", String)
], Request.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Request.prototype, "teamLeadId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: Decision,
        default: Decision.PENDING,
    }),
    __metadata("design:type", String)
], Request.prototype, "teamLeadDecision", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Request.prototype, "teamLeadNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Request.prototype, "adminId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: Decision,
        nullable: true,
    }),
    __metadata("design:type", String)
], Request.prototype, "adminDecision", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Request.prototype, "adminNotes", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Request.prototype, "rejectionReason", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Request.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Request.prototype, "requestedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Request.prototype, "teamLeadReviewedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Request.prototype, "adminReviewedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Request.prototype, "fulfilledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Request.prototype, "equipmentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, user => user.requests),
    (0, typeorm_1.JoinColumn)({ name: 'requesterId' }),
    __metadata("design:type", user_entity_1.User)
], Request.prototype, "requester", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, user => user.teamLeadRequests),
    (0, typeorm_1.JoinColumn)({ name: 'teamLeadId' }),
    __metadata("design:type", user_entity_1.User)
], Request.prototype, "teamLead", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, user => user.adminRequests, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'adminId' }),
    __metadata("design:type", user_entity_1.User)
], Request.prototype, "admin", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => equipment_entity_1.Equipment, equipment => equipment.requests, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'equipmentId' }),
    __metadata("design:type", equipment_entity_1.Equipment)
], Request.prototype, "equipment", void 0);
exports.Request = Request = __decorate([
    (0, typeorm_1.Entity)('requests')
], Request);
//# sourceMappingURL=request.entity.js.map