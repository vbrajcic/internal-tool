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
exports.InvoiceService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const invoice_entity_1 = require("../models/invoice.entity");
const subscription_entity_1 = require("../models/subscription.entity");
const user_entity_1 = require("../models/user.entity");
const s3_service_1 = require("./s3.service");
let InvoiceService = class InvoiceService {
    constructor(invoiceRepository, subscriptionRepository, userRepository, s3Service) {
        this.invoiceRepository = invoiceRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.s3Service = s3Service;
        this.MAX_FILE_SIZE = 10 * 1024 * 1024;
        this.ALLOWED_MIME_TYPES = ['application/pdf'];
        this.VERIFICATION_DEADLINE_DAYS = 7;
    }
    async uploadInvoice(subscriptionId, file, metadata, uploader) {
        const subscription = await this.validateSubscriptionAccess(subscriptionId, uploader);
        this.validateFile(file);
        this.validateInvoiceMetadata(metadata);
        try {
            const s3Key = this.generateS3Key(subscriptionId, file.originalname);
            const uploadResult = await this.s3Service.uploadFile(file, s3Key);
            const invoice = this.invoiceRepository.create({
                subscriptionId,
                fileName: file.originalname,
                filePath: uploadResult.Key,
                uploadedById: uploader.id,
                amount: metadata.amount,
                invoiceDate: metadata.invoiceDate,
                description: metadata.description,
                isVerified: false,
            });
            const savedInvoice = await this.invoiceRepository.save(invoice);
            return await this.invoiceRepository.findOne({
                where: { id: savedInvoice.id },
                relations: ['subscription', 'uploadedBy', 'verifiedBy']
            });
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(`Failed to upload invoice: ${error.message}`);
        }
    }
    async findBySubscription(subscriptionId, user) {
        await this.validateSubscriptionAccess(subscriptionId, user);
        return await this.invoiceRepository.find({
            where: { subscriptionId },
            relations: ['uploadedBy', 'verifiedBy'],
            order: { uploadedAt: 'DESC' }
        });
    }
    async findById(id, user) {
        const invoice = await this.invoiceRepository.findOne({
            where: { id },
            relations: ['subscription', 'uploadedBy', 'verifiedBy']
        });
        if (!invoice) {
            throw new common_1.NotFoundException('Invoice not found');
        }
        await this.validateSubscriptionAccess(invoice.subscriptionId, user);
        return invoice;
    }
    async verifyInvoice(id, verificationData, verifier) {
        if (verifier.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only administrators can verify invoices');
        }
        const invoice = await this.invoiceRepository.findOne({
            where: { id },
            relations: ['subscription', 'uploadedBy', 'verifiedBy']
        });
        if (!invoice) {
            throw new common_1.NotFoundException('Invoice not found');
        }
        if (invoice.isVerified) {
            throw new common_1.BadRequestException('Invoice is already verified');
        }
        if (verificationData.amount !== undefined) {
            invoice.updateAmount(verificationData.amount);
        }
        if (verificationData.invoiceDate) {
            invoice.updateInvoiceDate(verificationData.invoiceDate);
        }
        if (verificationData.description) {
            invoice.description = verificationData.description;
        }
        invoice.verify(verifier.id, verificationData.amount, verificationData.invoiceDate);
        return await this.invoiceRepository.save(invoice);
    }
    async unverifyInvoice(id, user) {
        if (user.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only administrators can unverify invoices');
        }
        const invoice = await this.findById(id, user);
        if (!invoice.isVerified) {
            throw new common_1.BadRequestException('Invoice is not verified');
        }
        invoice.unverify();
        return await this.invoiceRepository.save(invoice);
    }
    async downloadInvoice(id, user) {
        const invoice = await this.findById(id, user);
        try {
            return await this.s3Service.getFileUrl(invoice.filePath);
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(`Failed to generate download URL: ${error.message}`);
        }
    }
    async updateInvoice(id, updateData, user) {
        const invoice = await this.findById(id, user);
        if (user.role !== user_entity_1.UserRole.ADMIN && invoice.uploadedById !== user.id) {
            throw new common_1.ForbiddenException('You can only update invoices you uploaded');
        }
        if (invoice.isVerified && user.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Cannot update verified invoices');
        }
        if (updateData.amount !== undefined) {
            invoice.updateAmount(updateData.amount);
        }
        if (updateData.invoiceDate) {
            invoice.updateInvoiceDate(updateData.invoiceDate);
        }
        if (updateData.description !== undefined) {
            invoice.description = updateData.description;
        }
        return await this.invoiceRepository.save(invoice);
    }
    async deleteInvoice(id, user) {
        const invoice = await this.findById(id, user);
        if (user.role !== user_entity_1.UserRole.ADMIN && invoice.uploadedById !== user.id) {
            throw new common_1.ForbiddenException('You can only delete invoices you uploaded');
        }
        if (invoice.isVerified && user.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Cannot delete verified invoices');
        }
        try {
            await this.s3Service.deleteFile(invoice.filePath);
            await this.invoiceRepository.remove(invoice);
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(`Failed to delete invoice: ${error.message}`);
        }
    }
    async getInvoiceStats() {
        const allInvoices = await this.invoiceRepository.find({
            relations: ['subscription']
        });
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const verified = allInvoices.filter(i => i.isVerified);
        const unverified = allInvoices.filter(i => !i.isVerified);
        const thisMonth = allInvoices.filter(i => {
            const uploadDate = new Date(i.uploadedAt);
            return uploadDate.getMonth() === currentMonth && uploadDate.getFullYear() === currentYear;
        });
        const pendingVerification = unverified.filter(i => !i.isOverdue);
        const overdueVerification = unverified.filter(i => i.isOverdue);
        const totalAmount = verified
            .filter(i => i.amount)
            .reduce((sum, i) => sum + Number(i.amount), 0);
        const averageAmount = verified.length > 0
            ? totalAmount / verified.filter(i => i.amount).length
            : 0;
        return {
            totalInvoices: allInvoices.length,
            verifiedInvoices: verified.length,
            unverifiedInvoices: unverified.length,
            totalAmount,
            averageAmount,
            invoicesThisMonth: thisMonth.length,
            pendingVerification: pendingVerification.length,
            overdueVerification: overdueVerification.length,
        };
    }
    async getInvoicesForVerification(user) {
        if (user.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only administrators can view invoices for verification');
        }
        return await this.invoiceRepository.find({
            where: { isVerified: false },
            relations: ['subscription', 'uploadedBy'],
            order: { uploadedAt: 'ASC' }
        });
    }
    async getOverdueInvoices(user) {
        if (user.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only administrators can view overdue invoices');
        }
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.VERIFICATION_DEADLINE_DAYS);
        return await this.invoiceRepository
            .createQueryBuilder('invoice')
            .leftJoinAndSelect('invoice.subscription', 'subscription')
            .leftJoinAndSelect('invoice.uploadedBy', 'uploadedBy')
            .where('invoice.isVerified = :isVerified', { isVerified: false })
            .andWhere('invoice.uploadedAt <= :cutoffDate', { cutoffDate })
            .orderBy('invoice.uploadedAt', 'ASC')
            .getMany();
    }
    async bulkVerifyInvoices(invoiceIds, verifier) {
        if (verifier.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only administrators can bulk verify invoices');
        }
        if (invoiceIds.length === 0) {
            throw new common_1.BadRequestException('No invoice IDs provided');
        }
        if (invoiceIds.length > 50) {
            throw new common_1.BadRequestException('Cannot verify more than 50 invoices at once');
        }
        const invoices = await this.invoiceRepository.findByIds(invoiceIds);
        if (invoices.length !== invoiceIds.length) {
            throw new common_1.BadRequestException('Some invoices were not found');
        }
        const alreadyVerified = invoices.filter(i => i.isVerified);
        if (alreadyVerified.length > 0) {
            throw new common_1.BadRequestException(`Cannot verify already verified invoices: ${alreadyVerified.map(i => i.id).join(', ')}`);
        }
        invoices.forEach(invoice => {
            invoice.verify(verifier.id);
        });
        return await this.invoiceRepository.save(invoices);
    }
    extractFileMetadata(file) {
        return {
            fileName: file.originalname,
            fileSize: file.size,
            contentType: file.mimetype
        };
    }
    generateS3Key(subscriptionId, originalFileName) {
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const cleanFileName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        return `subscriptions/${subscriptionId}/invoices/${timestamp}-${randomSuffix}-${cleanFileName}`;
    }
    validateFile(file) {
        if (!file) {
            throw new common_1.BadRequestException('No file provided');
        }
        if (file.size > this.MAX_FILE_SIZE) {
            throw new common_1.BadRequestException(`File size exceeds maximum limit of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
        }
        if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new common_1.BadRequestException(`Invalid file type. Only PDF files are allowed. Received: ${file.mimetype}`);
        }
        if (!file.originalname.toLowerCase().endsWith('.pdf')) {
            throw new common_1.BadRequestException('File must have .pdf extension');
        }
    }
    validateInvoiceMetadata(metadata) {
        if (metadata.amount !== undefined) {
            if (metadata.amount <= 0) {
                throw new common_1.BadRequestException('Invoice amount must be positive');
            }
            if (metadata.amount > 1000000) {
                throw new common_1.BadRequestException('Invoice amount is unreasonably large');
            }
        }
        if (metadata.invoiceDate) {
            const now = new Date();
            const invoiceDate = new Date(metadata.invoiceDate);
            if (invoiceDate > now) {
                throw new common_1.BadRequestException('Invoice date cannot be in the future');
            }
            const twoYearsAgo = new Date();
            twoYearsAgo.setFullYear(now.getFullYear() - 2);
            if (invoiceDate < twoYearsAgo) {
                throw new common_1.BadRequestException('Invoice date cannot be older than 2 years');
            }
        }
        if (metadata.description && metadata.description.length > 1000) {
            throw new common_1.BadRequestException('Description cannot exceed 1000 characters');
        }
    }
    async validateSubscriptionAccess(subscriptionId, user) {
        const subscription = await this.subscriptionRepository.findOne({
            where: { id: subscriptionId },
            relations: ['owner', 'owner.team']
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        if (user.role === user_entity_1.UserRole.ADMIN) {
            return subscription;
        }
        if (subscription.ownerId === user.id) {
            return subscription;
        }
        if (user.role === user_entity_1.UserRole.TEAM_LEAD) {
            const owner = await this.userRepository.findOne({
                where: { id: subscription.ownerId },
                relations: ['team']
            });
            if (owner?.team && owner.team.leadId === user.id) {
                return subscription;
            }
        }
        throw new common_1.ForbiddenException('Access denied to this subscription');
    }
    async getMyInvoices(user) {
        const userSubscriptions = await this.subscriptionRepository.find({
            where: { ownerId: user.id },
            select: ['id']
        });
        if (userSubscriptions.length === 0) {
            return [];
        }
        const subscriptionIds = userSubscriptions.map(s => s.id);
        return await this.invoiceRepository.find({
            where: { subscriptionId: (0, typeorm_2.In)(subscriptionIds) },
            relations: ['subscription', 'uploadedBy', 'verifiedBy'],
            order: { uploadedAt: 'DESC' }
        });
    }
    async searchInvoices(filters, user) {
        const queryBuilder = this.invoiceRepository
            .createQueryBuilder('invoice')
            .leftJoinAndSelect('invoice.subscription', 'subscription')
            .leftJoinAndSelect('invoice.uploadedBy', 'uploadedBy')
            .leftJoinAndSelect('invoice.verifiedBy', 'verifiedBy');
        if (user.role === user_entity_1.UserRole.EMPLOYEE) {
            queryBuilder.andWhere('subscription.ownerId = :userId', { userId: user.id });
        }
        else if (user.role === user_entity_1.UserRole.TEAM_LEAD) {
            const teamMembers = await this.userRepository.find({
                where: { teamId: user.teamId },
                select: ['id']
            });
            const memberIds = teamMembers.map(m => m.id);
            queryBuilder.andWhere('subscription.ownerId IN (:...memberIds)', { memberIds });
        }
        if (filters.subscriptionId) {
            queryBuilder.andWhere('invoice.subscriptionId = :subscriptionId', {
                subscriptionId: filters.subscriptionId
            });
        }
        if (filters.isVerified !== undefined) {
            queryBuilder.andWhere('invoice.isVerified = :isVerified', {
                isVerified: filters.isVerified
            });
        }
        if (filters.startDate) {
            queryBuilder.andWhere('invoice.uploadedAt >= :startDate', {
                startDate: filters.startDate
            });
        }
        if (filters.endDate) {
            queryBuilder.andWhere('invoice.uploadedAt <= :endDate', {
                endDate: filters.endDate
            });
        }
        if (filters.minAmount !== undefined) {
            queryBuilder.andWhere('invoice.amount >= :minAmount', {
                minAmount: filters.minAmount
            });
        }
        if (filters.maxAmount !== undefined) {
            queryBuilder.andWhere('invoice.amount <= :maxAmount', {
                maxAmount: filters.maxAmount
            });
        }
        return await queryBuilder
            .orderBy('invoice.uploadedAt', 'DESC')
            .getMany();
    }
};
exports.InvoiceService = InvoiceService;
exports.InvoiceService = InvoiceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(invoice_entity_1.Invoice)),
    __param(1, (0, typeorm_1.InjectRepository)(subscription_entity_1.Subscription)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        s3_service_1.S3Service])
], InvoiceService);
//# sourceMappingURL=invoice.service.js.map