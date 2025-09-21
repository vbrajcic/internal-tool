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
exports.Equipment = exports.Condition = exports.ClassificationTag = exports.EquipmentStatus = exports.EquipmentType = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const transfer_entity_1 = require("./transfer.entity");
const request_entity_1 = require("./request.entity");
const QRCode = require("qrcode");
var EquipmentType;
(function (EquipmentType) {
    EquipmentType["LAPTOP"] = "Laptop";
    EquipmentType["DISPLAY"] = "Display";
    EquipmentType["PHONE"] = "Phone";
    EquipmentType["TABLET"] = "Tablet";
    EquipmentType["DONGLE"] = "Dongle";
    EquipmentType["KEYBOARD"] = "Keyboard";
    EquipmentType["MOUSE"] = "Mouse";
    EquipmentType["FURNITURE"] = "Furniture";
})(EquipmentType || (exports.EquipmentType = EquipmentType = {}));
var EquipmentStatus;
(function (EquipmentStatus) {
    EquipmentStatus["AVAILABLE"] = "Available";
    EquipmentStatus["ASSIGNED"] = "Assigned";
    EquipmentStatus["PENDING"] = "Pending";
    EquipmentStatus["BROKEN"] = "Broken";
    EquipmentStatus["STOLEN"] = "Stolen";
})(EquipmentStatus || (exports.EquipmentStatus = EquipmentStatus = {}));
var ClassificationTag;
(function (ClassificationTag) {
    ClassificationTag["PROFICO"] = "Profico";
    ClassificationTag["ZOPI"] = "ZOPI";
    ClassificationTag["LEASING"] = "Leasing";
})(ClassificationTag || (exports.ClassificationTag = ClassificationTag = {}));
var Condition;
(function (Condition) {
    Condition["NEW"] = "New";
    Condition["GOOD"] = "Good";
    Condition["FAIR"] = "Fair";
    Condition["POOR"] = "Poor";
})(Condition || (exports.Condition = Condition = {}));
let Equipment = class Equipment {
    async generateQRCode() {
        if (!this.qrCode) {
            this.qrCode = await QRCode.toDataURL(this.id);
        }
    }
};
exports.Equipment = Equipment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Equipment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Equipment.prototype, "serialNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Equipment.prototype, "qrCode", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Equipment.prototype, "brand", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Equipment.prototype, "model", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: EquipmentType,
    }),
    __metadata("design:type", String)
], Equipment.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: EquipmentStatus,
        default: EquipmentStatus.AVAILABLE,
    }),
    __metadata("design:type", String)
], Equipment.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", Date)
], Equipment.prototype, "purchaseDate", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ClassificationTag,
    }),
    __metadata("design:type", String)
], Equipment.prototype, "classificationTag", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Equipment.prototype, "currentOwnerId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: Condition,
        default: Condition.NEW,
    }),
    __metadata("design:type", String)
], Equipment.prototype, "condition", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Equipment.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Equipment.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Equipment.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, user => user.assignedEquipment),
    (0, typeorm_1.JoinColumn)({ name: 'currentOwnerId' }),
    __metadata("design:type", user_entity_1.User)
], Equipment.prototype, "currentOwner", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => transfer_entity_1.Transfer, transfer => transfer.equipment),
    __metadata("design:type", Array)
], Equipment.prototype, "transfers", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => request_entity_1.Request, request => request.equipment),
    __metadata("design:type", Array)
], Equipment.prototype, "requests", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Equipment.prototype, "generateQRCode", null);
exports.Equipment = Equipment = __decorate([
    (0, typeorm_1.Entity)('equipment')
], Equipment);
//# sourceMappingURL=equipment.entity.js.map