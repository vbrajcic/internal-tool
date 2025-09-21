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
exports.Subscription = exports.PaymentMethod = exports.BillingFrequency = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const invoice_entity_1 = require("./invoice.entity");
var BillingFrequency;
(function (BillingFrequency) {
    BillingFrequency["MONTHLY"] = "Monthly";
    BillingFrequency["YEARLY"] = "Yearly";
})(BillingFrequency || (exports.BillingFrequency = BillingFrequency = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["COMPANY_CARD"] = "CompanyCard";
    PaymentMethod["PERSONAL_REIMBURSED"] = "PersonalReimbursed";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
let Subscription = class Subscription {
    get totalPaid() {
        if (!this.invoices)
            return 0;
        return this.invoices
            .filter(invoice => invoice.isVerified && invoice.amount)
            .reduce((total, invoice) => total + Number(invoice.amount), 0);
    }
    get lastInvoiceDate() {
        if (!this.invoices || this.invoices.length === 0)
            return null;
        const sortedInvoices = this.invoices
            .filter(invoice => invoice.invoiceDate)
            .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
        return sortedInvoices.length > 0 ? sortedInvoices[0].invoiceDate : null;
    }
    get needsInvoiceReminder() {
        if (this.paymentMethod === PaymentMethod.COMPANY_CARD)
            return false;
        if (!this.isActive)
            return false;
        const now = new Date();
        const lastInvoice = this.lastInvoiceDate;
        if (!lastInvoice)
            return true;
        const daysSinceLastInvoice = Math.floor((now.getTime() - new Date(lastInvoice).getTime()) / (1000 * 60 * 60 * 24));
        return this.billingFrequency === BillingFrequency.MONTHLY
            ? daysSinceLastInvoice >= 30
            : daysSinceLastInvoice >= 365;
    }
};
exports.Subscription = Subscription;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Subscription.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Subscription.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Subscription.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: BillingFrequency,
    }),
    __metadata("design:type", String)
], Subscription.prototype, "billingFrequency", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PaymentMethod,
    }),
    __metadata("design:type", String)
], Subscription.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Subscription.prototype, "ownerId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Subscription.prototype, "ownerEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", Date)
], Subscription.prototype, "renewalDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Subscription.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Subscription.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Subscription.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, user => user.subscriptions),
    (0, typeorm_1.JoinColumn)({ name: 'ownerId' }),
    __metadata("design:type", user_entity_1.User)
], Subscription.prototype, "owner", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => invoice_entity_1.Invoice, invoice => invoice.subscription),
    __metadata("design:type", Array)
], Subscription.prototype, "invoices", void 0);
exports.Subscription = Subscription = __decorate([
    (0, typeorm_1.Entity)('subscriptions')
], Subscription);
//# sourceMappingURL=subscription.entity.js.map