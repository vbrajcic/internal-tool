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
exports.Invoice = void 0;
const typeorm_1 = require("typeorm");
const subscription_entity_1 = require("./subscription.entity");
const user_entity_1 = require("./user.entity");
let Invoice = class Invoice {
    get fileExtension() {
        return this.fileName.split('.').pop()?.toLowerCase() || '';
    }
    get isPdf() {
        return this.fileExtension === 'pdf';
    }
    get isRecentUpload() {
        const now = new Date();
        const uploadTime = new Date(this.uploadedAt);
        const hoursSinceUpload = (now.getTime() - uploadTime.getTime()) / (1000 * 60 * 60);
        return hoursSinceUpload <= 24;
    }
    get needsVerification() {
        return !this.isVerified && !this.isRecentUpload;
    }
    get monthYear() {
        if (!this.invoiceDate)
            return 'Unknown';
        const date = new Date(this.invoiceDate);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
    get isCurrentMonth() {
        if (!this.invoiceDate)
            return false;
        const now = new Date();
        const invoiceDate = new Date(this.invoiceDate);
        return (invoiceDate.getMonth() === now.getMonth() &&
            invoiceDate.getFullYear() === now.getFullYear());
    }
    get isOverdue() {
        if (this.isVerified)
            return false;
        const now = new Date();
        const uploadTime = new Date(this.uploadedAt);
        const daysSinceUpload = (now.getTime() - uploadTime.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUpload > 7;
    }
    verify(verifiedById, amount, invoiceDate) {
        if (this.isVerified) {
            throw new Error('Invoice is already verified');
        }
        this.isVerified = true;
        this.verifiedById = verifiedById;
        this.verifiedAt = new Date();
        if (amount !== undefined) {
            this.amount = amount;
        }
        if (invoiceDate) {
            this.invoiceDate = invoiceDate;
        }
    }
    unverify() {
        if (!this.isVerified) {
            throw new Error('Invoice is not verified');
        }
        this.isVerified = false;
        this.verifiedById = null;
        this.verifiedAt = null;
    }
    updateAmount(amount) {
        if (amount <= 0) {
            throw new Error('Invoice amount must be positive');
        }
        this.amount = amount;
    }
    updateInvoiceDate(date) {
        const now = new Date();
        if (date > now) {
            throw new Error('Invoice date cannot be in the future');
        }
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(now.getFullYear() - 2);
        if (date < twoYearsAgo) {
            throw new Error('Invoice date is too old (older than 2 years)');
        }
        this.invoiceDate = date;
    }
    static validateFileName(fileName) {
        const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
        const extension = fileName.split('.').pop()?.toLowerCase();
        return extension ? allowedExtensions.includes(extension) : false;
    }
    static generateS3Key(subscriptionId, fileName) {
        const timestamp = Date.now();
        const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        return `invoices/${subscriptionId}/${timestamp}_${cleanFileName}`;
    }
};
exports.Invoice = Invoice;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Invoice.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Invoice.prototype, "subscriptionId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Invoice.prototype, "fileName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Invoice.prototype, "filePath", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Invoice.prototype, "uploadedById", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Invoice.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", Date)
], Invoice.prototype, "invoiceDate", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Invoice.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Invoice.prototype, "isVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Invoice.prototype, "verifiedById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Invoice.prototype, "uploadedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Invoice.prototype, "verifiedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => subscription_entity_1.Subscription, subscription => subscription.invoices),
    (0, typeorm_1.JoinColumn)({ name: 'subscriptionId' }),
    __metadata("design:type", subscription_entity_1.Subscription)
], Invoice.prototype, "subscription", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'uploadedById' }),
    __metadata("design:type", user_entity_1.User)
], Invoice.prototype, "uploadedBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'verifiedById' }),
    __metadata("design:type", user_entity_1.User)
], Invoice.prototype, "verifiedBy", void 0);
exports.Invoice = Invoice = __decorate([
    (0, typeorm_1.Entity)('invoices')
], Invoice);
//# sourceMappingURL=invoice.entity.js.map