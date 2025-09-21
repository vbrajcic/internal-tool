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
exports.SubscriptionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");
const subscription_entity_1 = require("../models/subscription.entity");
const invoice_entity_1 = require("../models/invoice.entity");
const user_entity_1 = require("../models/user.entity");
let SubscriptionService = class SubscriptionService {
    constructor(subscriptionRepository, invoiceRepository, userRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.invoiceRepository = invoiceRepository;
        this.userRepository = userRepository;
    }
    async create(subscriptionData, currentUser) {
        const owner = await this.userRepository.findOne({
            where: { id: subscriptionData.ownerId }
        });
        if (!owner) {
            throw new common_1.BadRequestException('Owner not found');
        }
        if (owner.email !== subscriptionData.ownerEmail) {
            throw new common_1.BadRequestException('Owner email does not match user email');
        }
        if (currentUser.role === user_entity_1.UserRole.EMPLOYEE && currentUser.id !== subscriptionData.ownerId) {
            throw new common_1.ForbiddenException('Employees can only create subscriptions for themselves');
        }
        if (currentUser.role === user_entity_1.UserRole.TEAM_LEAD) {
        }
        this.validateSubscriptionData(subscriptionData);
        const subscription = this.subscriptionRepository.create({
            ...subscriptionData,
            isActive: true,
        });
        return await this.subscriptionRepository.save(subscription);
    }
    async findAll(filters = {}, pagination = { page: 1, limit: 20 }, currentUser) {
        const { page, limit } = pagination;
        const skip = (page - 1) * limit;
        const queryBuilder = this.subscriptionRepository
            .createQueryBuilder('subscription')
            .leftJoinAndSelect('subscription.owner', 'owner')
            .leftJoinAndSelect('subscription.invoices', 'invoices');
        this.applyRoleBasedFiltering(queryBuilder, currentUser);
        if (filters.ownerId) {
            queryBuilder.andWhere('subscription.ownerId = :ownerId', { ownerId: filters.ownerId });
        }
        if (filters.isActive !== undefined) {
            queryBuilder.andWhere('subscription.isActive = :isActive', { isActive: filters.isActive });
        }
        if (filters.paymentMethod) {
            queryBuilder.andWhere('subscription.paymentMethod = :paymentMethod', {
                paymentMethod: filters.paymentMethod
            });
        }
        if (filters.billingFrequency) {
            queryBuilder.andWhere('subscription.billingFrequency = :billingFrequency', {
                billingFrequency: filters.billingFrequency
            });
        }
        if (filters.startDate && filters.endDate) {
            queryBuilder.andWhere('subscription.createdAt BETWEEN :startDate AND :endDate', {
                startDate: filters.startDate,
                endDate: filters.endDate
            });
        }
        const total = await queryBuilder.getCount();
        const subscriptions = await queryBuilder
            .skip(skip)
            .take(limit)
            .orderBy('subscription.createdAt', 'DESC')
            .getMany();
        return {
            data: subscriptions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }
    async findById(id, currentUser) {
        const subscription = await this.subscriptionRepository.findOne({
            where: { id },
            relations: ['owner', 'invoices', 'invoices.uploadedBy', 'invoices.verifiedBy']
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        this.validateAccessToSubscription(subscription, currentUser);
        return subscription;
    }
    async update(id, updateData, currentUser) {
        const subscription = await this.findById(id, currentUser);
        if (updateData.price !== undefined && updateData.price < 0) {
            throw new common_1.BadRequestException('Price cannot be negative');
        }
        if (updateData.billingFrequency && !Object.values(subscription_entity_1.BillingFrequency).includes(updateData.billingFrequency)) {
            throw new common_1.BadRequestException('Invalid billing frequency');
        }
        if (updateData.paymentMethod && !Object.values(subscription_entity_1.PaymentMethod).includes(updateData.paymentMethod)) {
            throw new common_1.BadRequestException('Invalid payment method');
        }
        Object.assign(subscription, updateData);
        return await this.subscriptionRepository.save(subscription);
    }
    async deactivate(id, currentUser) {
        const subscription = await this.findById(id, currentUser);
        subscription.isActive = false;
        return await this.subscriptionRepository.save(subscription);
    }
    async getInvoices(subscriptionId, currentUser) {
        const subscription = await this.findById(subscriptionId, currentUser);
        return await this.invoiceRepository.find({
            where: { subscriptionId: subscription.id },
            relations: ['uploadedBy', 'verifiedBy'],
            order: { uploadedAt: 'DESC' }
        });
    }
    async exportSubscriptions(format, filters = {}, currentUser) {
        if (currentUser.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only administrators can export subscription data');
        }
        if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
            throw new common_1.BadRequestException('Start date must be before end date');
        }
        const queryBuilder = this.subscriptionRepository
            .createQueryBuilder('subscription')
            .leftJoinAndSelect('subscription.owner', 'owner')
            .leftJoinAndSelect('subscription.invoices', 'invoices');
        if (filters.startDate && filters.endDate) {
            queryBuilder.andWhere('subscription.createdAt BETWEEN :startDate AND :endDate', {
                startDate: filters.startDate,
                endDate: filters.endDate
            });
        }
        if (filters.paymentMethod) {
            queryBuilder.andWhere('subscription.paymentMethod = :paymentMethod', {
                paymentMethod: filters.paymentMethod
            });
        }
        if (filters.isActive !== undefined) {
            queryBuilder.andWhere('subscription.isActive = :isActive', { isActive: filters.isActive });
        }
        const subscriptions = await queryBuilder
            .orderBy('subscription.createdAt', 'DESC')
            .getMany();
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        switch (format) {
            case 'csv':
                return this.generateCSVExport(subscriptions, timestamp);
            case 'excel':
                return this.generateExcelExport(subscriptions, timestamp);
            case 'pdf':
                return await this.generatePDFExport(subscriptions, timestamp);
            default:
                throw new common_1.BadRequestException('Invalid export format');
        }
    }
    async getCostAnalysis() {
        const subscriptions = await this.subscriptionRepository.find({
            where: { isActive: true },
            relations: ['invoices']
        });
        const monthlyTotal = subscriptions
            .filter(s => s.billingFrequency === subscription_entity_1.BillingFrequency.MONTHLY)
            .reduce((sum, s) => sum + Number(s.price), 0);
        const yearlyTotal = subscriptions
            .filter(s => s.billingFrequency === subscription_entity_1.BillingFrequency.YEARLY)
            .reduce((sum, s) => sum + Number(s.price), 0);
        const annualProjection = (monthlyTotal * 12) + yearlyTotal;
        const companyCardCost = subscriptions
            .filter(s => s.paymentMethod === subscription_entity_1.PaymentMethod.COMPANY_CARD)
            .reduce((sum, s) => {
            const annualCost = s.billingFrequency === subscription_entity_1.BillingFrequency.MONTHLY
                ? Number(s.price) * 12
                : Number(s.price);
            return sum + annualCost;
        }, 0);
        const personalReimbursedCost = annualProjection - companyCardCost;
        const topSubscriptions = subscriptions
            .map(s => ({
            name: s.name,
            price: Number(s.price),
            billingFrequency: s.billingFrequency,
            annualCost: s.billingFrequency === subscription_entity_1.BillingFrequency.MONTHLY
                ? Number(s.price) * 12
                : Number(s.price)
        }))
            .sort((a, b) => b.annualCost - a.annualCost)
            .slice(0, 10);
        return {
            monthlyTotal,
            yearlyTotal,
            annualProjection,
            costBreakdown: {
                byFrequency: {
                    monthly: monthlyTotal,
                    yearly: yearlyTotal
                },
                byPaymentMethod: {
                    companyCard: companyCardCost,
                    personalReimbursed: personalReimbursedCost
                }
            },
            topSubscriptions
        };
    }
    async getSubscriptionStats() {
        const allSubscriptions = await this.subscriptionRepository.find();
        const active = allSubscriptions.filter(s => s.isActive);
        const inactive = allSubscriptions.filter(s => !s.isActive);
        const monthly = allSubscriptions.filter(s => s.billingFrequency === subscription_entity_1.BillingFrequency.MONTHLY);
        const yearly = allSubscriptions.filter(s => s.billingFrequency === subscription_entity_1.BillingFrequency.YEARLY);
        const companyCard = allSubscriptions.filter(s => s.paymentMethod === subscription_entity_1.PaymentMethod.COMPANY_CARD);
        const personalReimbursed = allSubscriptions.filter(s => s.paymentMethod === subscription_entity_1.PaymentMethod.PERSONAL_REIMBURSED);
        const totalMonthlyCost = monthly.reduce((sum, s) => sum + Number(s.price), 0);
        const totalYearlyCost = yearly.reduce((sum, s) => sum + Number(s.price), 0);
        const companyCardCost = companyCard.reduce((sum, s) => {
            const annualCost = s.billingFrequency === subscription_entity_1.BillingFrequency.MONTHLY
                ? Number(s.price) * 12
                : Number(s.price);
            return sum + annualCost;
        }, 0);
        const personalReimbursedCost = personalReimbursed.reduce((sum, s) => {
            const annualCost = s.billingFrequency === subscription_entity_1.BillingFrequency.MONTHLY
                ? Number(s.price) * 12
                : Number(s.price);
            return sum + annualCost;
        }, 0);
        return {
            totalActive: active.length,
            totalInactive: inactive.length,
            totalMonthlySubscriptions: monthly.length,
            totalYearlySubscriptions: yearly.length,
            totalMonthlyCost,
            totalYearlyCost,
            byPaymentMethod: {
                companyCard: companyCard.length,
                personalReimbursed: personalReimbursed.length
            },
            costByPaymentMethod: {
                companyCard: companyCardCost,
                personalReimbursed: personalReimbursedCost
            }
        };
    }
    async getRenewalReminders() {
        const now = new Date();
        const in30Days = new Date();
        in30Days.setDate(now.getDate() + 30);
        const subscriptions = await this.subscriptionRepository.find({
            where: {
                isActive: true,
                renewalDate: (0, typeorm_2.Between)(now, in30Days)
            },
            relations: ['invoices']
        });
        return subscriptions.map(subscription => {
            const daysUntilRenewal = subscription.renewalDate
                ? Math.ceil((new Date(subscription.renewalDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : 0;
            return {
                subscriptionId: subscription.id,
                subscriptionName: subscription.name,
                ownerEmail: subscription.ownerEmail,
                renewalDate: subscription.renewalDate,
                daysUntilRenewal,
                needsInvoiceReminder: subscription.needsInvoiceReminder,
                lastInvoiceDate: subscription.lastInvoiceDate
            };
        });
    }
    validateSubscriptionData(data) {
        if (!data.name || data.name.trim().length === 0) {
            throw new common_1.BadRequestException('Subscription name is required');
        }
        if (data.price < 0) {
            throw new common_1.BadRequestException('Price cannot be negative');
        }
        if (!Object.values(subscription_entity_1.BillingFrequency).includes(data.billingFrequency)) {
            throw new common_1.BadRequestException('Invalid billing frequency');
        }
        if (!Object.values(subscription_entity_1.PaymentMethod).includes(data.paymentMethod)) {
            throw new common_1.BadRequestException('Invalid payment method');
        }
        if (!this.isValidEmail(data.ownerEmail)) {
            throw new common_1.BadRequestException('Invalid email format');
        }
        if (!this.isValidUUID(data.ownerId)) {
            throw new common_1.BadRequestException('Invalid owner ID format');
        }
    }
    applyRoleBasedFiltering(queryBuilder, currentUser) {
        if (currentUser.role === user_entity_1.UserRole.EMPLOYEE) {
            queryBuilder.andWhere('subscription.ownerId = :userId', { userId: currentUser.id });
        }
        else if (currentUser.role === user_entity_1.UserRole.TEAM_LEAD) {
        }
    }
    validateAccessToSubscription(subscription, currentUser) {
        if (currentUser.role === user_entity_1.UserRole.EMPLOYEE && subscription.ownerId !== currentUser.id) {
            throw new common_1.ForbiddenException('Access denied to this subscription');
        }
        if (currentUser.role === user_entity_1.UserRole.TEAM_LEAD) {
        }
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }
    generateCSVExport(subscriptions, timestamp) {
        const headers = [
            'ID', 'Name', 'Price', 'Billing Frequency', 'Payment Method',
            'Owner Email', 'Renewal Date', 'Is Active', 'Created At',
            'Total Paid', 'Last Invoice Date', 'Invoice Count'
        ];
        const rows = subscriptions.map(sub => [
            sub.id,
            sub.name,
            sub.price,
            sub.billingFrequency,
            sub.paymentMethod,
            sub.ownerEmail,
            sub.renewalDate ? sub.renewalDate.toISOString().split('T')[0] : '',
            sub.isActive,
            sub.createdAt.toISOString().split('T')[0],
            sub.totalPaid,
            sub.lastInvoiceDate ? sub.lastInvoiceDate.toISOString().split('T')[0] : '',
            sub.invoices ? sub.invoices.length : 0
        ]);
        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        return {
            buffer: Buffer.from(csvContent, 'utf-8'),
            filename: `subscriptions_export_${timestamp}.csv`,
            contentType: 'application/octet-stream'
        };
    }
    generateExcelExport(subscriptions, timestamp) {
        const headers = [
            'ID', 'Name', 'Price', 'Billing Frequency', 'Payment Method',
            'Owner Email', 'Renewal Date', 'Is Active', 'Created At',
            'Total Paid', 'Last Invoice Date', 'Invoice Count'
        ];
        const data = subscriptions.map(sub => ({
            'ID': sub.id,
            'Name': sub.name,
            'Price': sub.price,
            'Billing Frequency': sub.billingFrequency,
            'Payment Method': sub.paymentMethod,
            'Owner Email': sub.ownerEmail,
            'Renewal Date': sub.renewalDate ? sub.renewalDate.toISOString().split('T')[0] : '',
            'Is Active': sub.isActive,
            'Created At': sub.createdAt.toISOString().split('T')[0],
            'Total Paid': sub.totalPaid,
            'Last Invoice Date': sub.lastInvoiceDate ? sub.lastInvoiceDate.toISOString().split('T')[0] : '',
            'Invoice Count': sub.invoices ? sub.invoices.length : 0
        }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Subscriptions');
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        return {
            buffer: Buffer.from(buffer),
            filename: `subscriptions_export_${timestamp}.xlsx`,
            contentType: 'application/octet-stream'
        };
    }
    async generatePDFExport(subscriptions, timestamp) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument();
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('error', reject);
            doc.fontSize(20).text('Subscriptions Export Report', 50, 50);
            doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 80);
            doc.fontSize(12).text(`Total Subscriptions: ${subscriptions.length}`, 50, 100);
            let yPosition = 140;
            subscriptions.forEach((sub, index) => {
                if (yPosition > 700) {
                    doc.addPage();
                    yPosition = 50;
                }
                doc.fontSize(14).text(`${index + 1}. ${sub.name}`, 50, yPosition);
                yPosition += 20;
                doc.fontSize(10)
                    .text(`Price: $${sub.price} (${sub.billingFrequency})`, 70, yPosition)
                    .text(`Payment: ${sub.paymentMethod}`, 70, yPosition + 15)
                    .text(`Owner: ${sub.ownerEmail}`, 70, yPosition + 30)
                    .text(`Status: ${sub.isActive ? 'Active' : 'Inactive'}`, 70, yPosition + 45)
                    .text(`Total Paid: $${sub.totalPaid}`, 70, yPosition + 60);
                yPosition += 90;
            });
            doc.end();
            doc.on('end', () => {
                const buffer = Buffer.concat(buffers);
                resolve({
                    buffer,
                    filename: `subscriptions_export_${timestamp}.pdf`,
                    contentType: 'application/octet-stream'
                });
            });
        });
    }
};
exports.SubscriptionService = SubscriptionService;
exports.SubscriptionService = SubscriptionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(subscription_entity_1.Subscription)),
    __param(1, (0, typeorm_1.InjectRepository)(invoice_entity_1.Invoice)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], SubscriptionService);
//# sourceMappingURL=subscription.service.js.map