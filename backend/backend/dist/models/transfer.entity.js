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
exports.Transfer = exports.TransferType = void 0;
const typeorm_1 = require("typeorm");
const equipment_entity_1 = require("./equipment.entity");
const user_entity_1 = require("./user.entity");
var TransferType;
(function (TransferType) {
    TransferType["ASSIGNMENT"] = "Assignment";
    TransferType["RETURN"] = "Return";
    TransferType["TRANSFER"] = "Transfer";
    TransferType["DECOMMISSION"] = "Decommission";
})(TransferType || (exports.TransferType = TransferType = {}));
let Transfer = class Transfer {
    get isCompleted() {
        return this.transferredAt !== null;
    }
    get isPending() {
        return !this.isCompleted;
    }
    get requiresFromUserConfirmation() {
        return this.fromUserId !== null && !this.fromUserConfirmed;
    }
    get requiresToUserConfirmation() {
        return this.toUserId !== null && !this.toUserConfirmed;
    }
    get requiresAdminConfirmation() {
        return !this.adminConfirmed;
    }
    get allConfirmationsReceived() {
        const fromConfirmed = this.fromUserId === null || this.fromUserConfirmed;
        const toConfirmed = this.toUserId === null || this.toUserConfirmed;
        return fromConfirmed && toConfirmed && this.adminConfirmed;
    }
    get transferDescription() {
        switch (this.transferType) {
            case TransferType.ASSIGNMENT:
                return `Assignment to ${this.toUser?.firstName} ${this.toUser?.lastName}`;
            case TransferType.RETURN:
                return `Return from ${this.fromUser?.firstName} ${this.fromUser?.lastName} to equipment pool`;
            case TransferType.TRANSFER:
                return `Transfer from ${this.fromUser?.firstName} ${this.fromUser?.lastName} to ${this.toUser?.firstName} ${this.toUser?.lastName}`;
            case TransferType.DECOMMISSION:
                return `Decommissioning from ${this.fromUser?.firstName} ${this.fromUser?.lastName}`;
            default:
                return 'Unknown transfer type';
        }
    }
    confirmByFromUser() {
        if (!this.fromUserId) {
            throw new Error('No from user to confirm transfer');
        }
        if (this.fromUserConfirmed) {
            throw new Error('Transfer already confirmed by from user');
        }
        if (this.isCompleted) {
            throw new Error('Transfer already completed');
        }
        this.fromUserConfirmed = true;
        this.checkAndCompleteTransfer();
    }
    confirmByToUser() {
        if (!this.toUserId) {
            throw new Error('No to user to confirm transfer');
        }
        if (this.toUserConfirmed) {
            throw new Error('Transfer already confirmed by to user');
        }
        if (this.isCompleted) {
            throw new Error('Transfer already completed');
        }
        this.toUserConfirmed = true;
        this.checkAndCompleteTransfer();
    }
    confirmByAdmin() {
        if (this.adminConfirmed) {
            throw new Error('Transfer already confirmed by admin');
        }
        if (this.isCompleted) {
            throw new Error('Transfer already completed');
        }
        this.adminConfirmed = true;
        this.checkAndCompleteTransfer();
    }
    checkAndCompleteTransfer() {
        if (this.allConfirmationsReceived && !this.isCompleted) {
            this.transferredAt = new Date();
        }
    }
    static determineTransferType(fromUserId, toUserId) {
        if (!fromUserId && toUserId) {
            return TransferType.ASSIGNMENT;
        }
        if (fromUserId && !toUserId) {
            return TransferType.RETURN;
        }
        if (fromUserId && toUserId) {
            return TransferType.TRANSFER;
        }
        return TransferType.DECOMMISSION;
    }
};
exports.Transfer = Transfer;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Transfer.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Transfer.prototype, "equipmentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Transfer.prototype, "fromUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Transfer.prototype, "toUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: TransferType,
    }),
    __metadata("design:type", String)
], Transfer.prototype, "transferType", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], Transfer.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Transfer.prototype, "fromUserConfirmed", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Transfer.prototype, "toUserConfirmed", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Transfer.prototype, "adminConfirmed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Transfer.prototype, "transferredAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Transfer.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => equipment_entity_1.Equipment, equipment => equipment.transfers),
    (0, typeorm_1.JoinColumn)({ name: 'equipmentId' }),
    __metadata("design:type", equipment_entity_1.Equipment)
], Transfer.prototype, "equipment", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'fromUserId' }),
    __metadata("design:type", user_entity_1.User)
], Transfer.prototype, "fromUser", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'toUserId' }),
    __metadata("design:type", user_entity_1.User)
], Transfer.prototype, "toUser", void 0);
exports.Transfer = Transfer = __decorate([
    (0, typeorm_1.Entity)('transfers')
], Transfer);
//# sourceMappingURL=transfer.entity.js.map