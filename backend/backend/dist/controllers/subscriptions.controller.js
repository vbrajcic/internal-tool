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
exports.SubscriptionsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const subscription_service_1 = require("../services/subscription.service");
const invoice_service_1 = require("../services/invoice.service");
const subscription_entity_1 = require("../models/subscription.entity");
const invoice_entity_1 = require("../models/invoice.entity");
const user_entity_1 = require("../models/user.entity");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let SubscriptionsController = class SubscriptionsController {
    constructor(subscriptionService, invoiceService) {
        this.subscriptionService = subscriptionService;
        this.invoiceService = invoiceService;
    }
    async getSubscriptions(ownerId, isActive, billingFrequency, paymentMethod, page, limit, req) {
        const currentUser = req.user;
        const filters = {};
        if (ownerId)
            filters.ownerId = ownerId;
        if (isActive !== undefined)
            filters.isActive = isActive;
        if (billingFrequency)
            filters.billingFrequency = billingFrequency;
        if (paymentMethod)
            filters.paymentMethod = paymentMethod;
        if (currentUser.role === user_entity_1.UserRole.EMPLOYEE) {
            filters.ownerId = currentUser.id;
        }
        const pagination = { page, limit };
        const result = await this.subscriptionService.findAll(filters, pagination, currentUser);
        return {
            subscriptions: result.items,
            pagination: result.pagination,
        };
    }
    async createSubscription(createSubscriptionDto, req) {
        const currentUser = req.user;
        return this.subscriptionService.create(createSubscriptionDto, currentUser);
    }
    async exportSubscriptions(res, req, format, startDate, endDate, includeInvoices) {
        const currentUser = req.user;
        const exportOptions = {
            format,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            includeInvoices,
        };
        const exportResult = await this.subscriptionService.exportSubscriptions(format, { startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined }, currentUser);
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `subscriptions_export_${timestamp}.${format}`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', exportResult.contentType);
        res.send(exportResult.buffer);
    }
    async getSubscriptionById(id, req) {
        const currentUser = req.user;
        return this.subscriptionService.findById(id, currentUser);
    }
    async updateSubscription(id, updateSubscriptionDto, req) {
        const currentUser = req.user;
        return this.subscriptionService.update(id, updateSubscriptionDto, currentUser);
    }
    async getSubscriptionInvoices(id, page, limit, req) {
        const currentUser = req.user;
        const pagination = { page, limit };
        const result = await this.invoiceService.findBySubscription(id, pagination, currentUser);
        return {
            invoices: result.items,
            pagination: result.pagination,
        };
    }
    async uploadInvoice(subscriptionId, file, invoiceData, req) {
        const currentUser = req.user;
        if (!file) {
            throw new common_1.HttpException('Invoice file is required', common_1.HttpStatus.BAD_REQUEST);
        }
        if (file.mimetype !== 'application/pdf') {
            throw new common_1.HttpException('Only PDF files are allowed', common_1.HttpStatus.BAD_REQUEST);
        }
        const createInvoiceDto = {
            subscriptionId,
            fileName: file.originalname,
            fileBuffer: file.buffer,
            amount: invoiceData.amount ? parseFloat(invoiceData.amount) : undefined,
            invoiceDate: invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate) : undefined,
            description: invoiceData.description,
        };
        return this.invoiceService.create(createInvoiceDto, currentUser);
    }
    async getSubscriptionAnalytics(id, req) {
        const currentUser = req.user;
        return this.subscriptionService.getAnalytics(id, currentUser);
    }
    async sendRenewalReminders(reminderConfig = {}, req) {
        const currentUser = req.user;
        const { daysBeforeRenewal = 30, includeInactive = false } = reminderConfig;
        return this.subscriptionService.sendRenewalReminders(daysBeforeRenewal, includeInactive, currentUser);
    }
};
exports.SubscriptionsController = SubscriptionsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'List subscriptions',
        description: 'Get subscriptions with filtering and pagination'
    }),
    (0, swagger_1.ApiQuery)({ name: 'ownerId', type: 'string', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'isActive', type: 'boolean', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'billingFrequency', enum: subscription_entity_1.BillingFrequency, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'paymentMethod', enum: subscription_entity_1.PaymentMethod, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', type: 'number', required: false, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', type: 'number', required: false, example: 50 }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Subscriptions retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                subscriptions: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Subscription' }
                },
                pagination: { $ref: '#/components/schemas/Pagination' }
            }
        }
    }),
    __param(0, (0, common_1.Query)('ownerId', new common_1.ParseUUIDPipe({ optional: true }))),
    __param(1, (0, common_1.Query)('isActive')),
    __param(2, (0, common_1.Query)('billingFrequency')),
    __param(3, (0, common_1.Query)('paymentMethod')),
    __param(4, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(5, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __param(6, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean, String, String, Number, Number, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getSubscriptions", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN, user_entity_1.UserRole.TEAM_LEAD),
    (0, swagger_1.ApiOperation)({
        summary: 'Create subscription',
        description: 'Register new software subscription with billing information'
    }),
    (0, swagger_1.ApiBody)({
        description: 'Subscription creation data',
        schema: {
            type: 'object',
            required: ['name', 'price', 'billingFrequency', 'paymentMethod', 'ownerId'],
            properties: {
                name: { type: 'string' },
                price: { type: 'number', format: 'decimal' },
                billingFrequency: { enum: Object.values(subscription_entity_1.BillingFrequency) },
                paymentMethod: { enum: Object.values(subscription_entity_1.PaymentMethod) },
                ownerId: { type: 'string' },
                ownerEmail: { type: 'string', format: 'email' },
                renewalDate: { type: 'string', format: 'date' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Subscription created successfully',
        type: subscription_entity_1.Subscription
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid request data' }),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "createSubscription", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Export subscription data',
        description: 'Export subscription and invoice data for accounting reconciliation'
    }),
    (0, swagger_1.ApiQuery)({
        name: 'format',
        enum: ['excel', 'csv', 'json'],
        required: false,
        description: 'Export format (default: excel)'
    }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', type: 'string', required: false, description: 'Start date (YYYY-MM-DD)' }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', type: 'string', required: false, description: 'End date (YYYY-MM-DD)' }),
    (0, swagger_1.ApiQuery)({ name: 'includeInvoices', type: 'boolean', required: false, description: 'Include invoice data' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Export file generated successfully',
        headers: {
            'Content-Disposition': {
                description: 'File download attachment',
                schema: { type: 'string' }
            },
            'Content-Type': {
                description: 'MIME type of the exported file',
                schema: { type: 'string' }
            }
        }
    }),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Query)("format")),
    __param(3, (0, common_1.Query)("startDate")),
    __param(4, (0, common_1.Query)("endDate")),
    __param(5, (0, common_1.Query)("includeInvoices")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String, Boolean]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "exportSubscriptions", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get subscription details',
        description: 'Retrieve subscription with invoice history and owner information'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Subscription details retrieved',
        schema: {
            allOf: [
                { $ref: '#/components/schemas/Subscription' },
                {
                    type: 'object',
                    properties: {
                        owner: { $ref: '#/components/schemas/UserSummary' },
                        invoices: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Invoice' }
                        },
                        totalSpend: { type: 'number', format: 'decimal' },
                        nextRenewal: { type: 'string', format: 'date' }
                    }
                }
            ]
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Subscription not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getSubscriptionById", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update subscription',
        description: 'Update subscription information and billing details'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, swagger_1.ApiBody)({
        description: 'Subscription update data',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                price: { type: 'number', format: 'decimal' },
                billingFrequency: { enum: Object.values(subscription_entity_1.BillingFrequency) },
                paymentMethod: { enum: Object.values(subscription_entity_1.PaymentMethod) },
                renewalDate: { type: 'string', format: 'date' },
                isActive: { type: 'boolean' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Subscription updated successfully',
        type: subscription_entity_1.Subscription
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Subscription not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "updateSubscription", null);
__decorate([
    (0, common_1.Get)(':id/invoices'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get subscription invoices',
        description: 'Retrieve all invoices for a specific subscription'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, swagger_1.ApiQuery)({ name: 'page', type: 'number', required: false, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', type: 'number', required: false, example: 20 }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Invoices retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                invoices: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Invoice' }
                },
                pagination: { $ref: '#/components/schemas/Pagination' }
            }
        }
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getSubscriptionInvoices", null);
__decorate([
    (0, common_1.Post)(':id/invoices'),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload subscription invoice',
        description: 'Upload invoice file with automatic metadata extraction'
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, swagger_1.ApiBody)({
        description: 'Invoice upload data',
        schema: {
            type: 'object',
            required: ['file'],
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'PDF invoice file'
                },
                amount: {
                    type: 'number',
                    format: 'decimal',
                    description: 'Manual amount override'
                },
                invoiceDate: {
                    type: 'string',
                    format: 'date',
                    description: 'Manual invoice date override'
                },
                description: {
                    type: 'string',
                    description: 'Optional invoice description'
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Invoice uploaded successfully',
        type: invoice_entity_1.Invoice
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid file or subscription data' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "uploadInvoice", null);
__decorate([
    (0, common_1.Get)(':id/analytics'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN, user_entity_1.UserRole.TEAM_LEAD),
    (0, swagger_1.ApiOperation)({
        summary: 'Get subscription analytics',
        description: 'Retrieve subscription usage and cost analytics'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Analytics data retrieved',
        schema: {
            type: 'object',
            properties: {
                totalSpend: { type: 'number', format: 'decimal' },
                monthlyAverage: { type: 'number', format: 'decimal' },
                invoiceCount: { type: 'number' },
                lastInvoiceDate: { type: 'string', format: 'date' },
                renewalInfo: {
                    type: 'object',
                    properties: {
                        nextRenewal: { type: 'string', format: 'date' },
                        daysUntilRenewal: { type: 'number' },
                        renewalReminded: { type: 'boolean' }
                    }
                },
                complianceStatus: {
                    type: 'object',
                    properties: {
                        hasInvoices: { type: 'boolean' },
                        invoiceCoverage: { type: 'number', description: 'Percentage of billing periods with invoices' },
                        missingInvoices: { type: 'number' }
                    }
                }
            }
        }
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getSubscriptionAnalytics", null);
__decorate([
    (0, common_1.Post)('send-reminders'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Send renewal reminders',
        description: 'Send email reminders for upcoming subscription renewals'
    }),
    (0, swagger_1.ApiBody)({
        description: 'Reminder configuration',
        schema: {
            type: 'object',
            properties: {
                daysBeforeRenewal: {
                    type: 'number',
                    default: 30,
                    description: 'Send reminders for subscriptions renewing within this many days'
                },
                includeInactive: {
                    type: 'boolean',
                    default: false,
                    description: 'Include inactive subscriptions in reminders'
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Reminders sent successfully',
        schema: {
            type: 'object',
            properties: {
                remindersSent: { type: 'number' },
                subscriptionsProcessed: { type: 'number' },
                errors: {
                    type: 'array',
                    items: { type: 'string' }
                }
            }
        }
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "sendRenewalReminders", null);
exports.SubscriptionsController = SubscriptionsController = __decorate([
    (0, swagger_1.ApiTags)('subscriptions'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('api/subscriptions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [subscription_service_1.SubscriptionService,
        invoice_service_1.InvoiceService])
], SubscriptionsController);
//# sourceMappingURL=subscriptions.controller.js.map