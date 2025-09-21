"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const typeorm_1 = require("@nestjs/typeorm");
const subscription_service_1 = require("./subscription.service");
const subscription_entity_1 = require("../models/subscription.entity");
const invoice_entity_1 = require("../models/invoice.entity");
const user_entity_1 = require("../models/user.entity");
const common_1 = require("@nestjs/common");
describe('SubscriptionService', () => {
    let service;
    let subscriptionRepo;
    let invoiceRepo;
    let userRepo;
    const mockSubscriptionRepo = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getCount: jest.fn(),
            getMany: jest.fn(),
        })),
    };
    const mockInvoiceRepo = {
        find: jest.fn(),
    };
    const mockUserRepo = {
        findOne: jest.fn(),
    };
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                subscription_service_1.SubscriptionService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(subscription_entity_1.Subscription),
                    useValue: mockSubscriptionRepo,
                },
                {
                    provide: (0, typeorm_1.getRepositoryToken)(invoice_entity_1.Invoice),
                    useValue: mockInvoiceRepo,
                },
                {
                    provide: (0, typeorm_1.getRepositoryToken)(user_entity_1.User),
                    useValue: mockUserRepo,
                },
            ],
        }).compile();
        service = module.get(subscription_service_1.SubscriptionService);
        subscriptionRepo = module.get((0, typeorm_1.getRepositoryToken)(subscription_entity_1.Subscription));
        invoiceRepo = module.get((0, typeorm_1.getRepositoryToken)(invoice_entity_1.Invoice));
        userRepo = module.get((0, typeorm_1.getRepositoryToken)(user_entity_1.User));
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    describe('create', () => {
        const mockUser = {
            id: 'user-id',
            email: 'test@company.com',
            role: user_entity_1.UserRole.ADMIN,
        };
        const mockOwner = {
            id: 'owner-id',
            email: 'owner@company.com',
        };
        const createSubscriptionDto = {
            name: 'Test Subscription',
            price: 29.99,
            billingFrequency: subscription_entity_1.BillingFrequency.MONTHLY,
            paymentMethod: subscription_entity_1.PaymentMethod.COMPANY_CARD,
            ownerId: 'owner-id',
            ownerEmail: 'owner@company.com',
        };
        it('should create a subscription successfully', async () => {
            mockUserRepo.findOne.mockResolvedValue(mockOwner);
            mockSubscriptionRepo.create.mockReturnValue(createSubscriptionDto);
            mockSubscriptionRepo.save.mockResolvedValue({ ...createSubscriptionDto, id: 'sub-id' });
            const result = await service.create(createSubscriptionDto, mockUser);
            expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 'owner-id' } });
            expect(subscriptionRepo.create).toHaveBeenCalled();
            expect(subscriptionRepo.save).toHaveBeenCalled();
            expect(result).toEqual({ ...createSubscriptionDto, id: 'sub-id' });
        });
        it('should throw BadRequestException if owner not found', async () => {
            mockUserRepo.findOne.mockResolvedValue(null);
            await expect(service.create(createSubscriptionDto, mockUser))
                .rejects.toThrow(common_1.BadRequestException);
        });
        it('should throw BadRequestException if owner email does not match', async () => {
            const wrongOwner = { ...mockOwner, email: 'wrong@company.com' };
            mockUserRepo.findOne.mockResolvedValue(wrongOwner);
            await expect(service.create(createSubscriptionDto, mockUser))
                .rejects.toThrow(common_1.BadRequestException);
        });
        it('should throw ForbiddenException if employee tries to create for someone else', async () => {
            const employeeUser = { ...mockUser, role: user_entity_1.UserRole.EMPLOYEE, id: 'different-id' };
            mockUserRepo.findOne.mockResolvedValue(mockOwner);
            await expect(service.create(createSubscriptionDto, employeeUser))
                .rejects.toThrow(common_1.ForbiddenException);
        });
        it('should validate negative price', async () => {
            const invalidDto = { ...createSubscriptionDto, price: -10 };
            mockUserRepo.findOne.mockResolvedValue(mockOwner);
            await expect(service.create(invalidDto, mockUser))
                .rejects.toThrow(common_1.BadRequestException);
        });
        it('should validate invalid email format', async () => {
            const invalidDto = { ...createSubscriptionDto, ownerEmail: 'invalid-email' };
            mockUserRepo.findOne.mockResolvedValue({ ...mockOwner, email: 'invalid-email' });
            await expect(service.create(invalidDto, mockUser))
                .rejects.toThrow(common_1.BadRequestException);
        });
    });
    describe('findById', () => {
        const mockUser = {
            id: 'user-id',
            role: user_entity_1.UserRole.ADMIN,
        };
        const mockSubscription = {
            id: 'sub-id',
            name: 'Test Subscription',
            ownerId: 'owner-id',
        };
        it('should find subscription by id', async () => {
            mockSubscriptionRepo.findOne.mockResolvedValue(mockSubscription);
            const result = await service.findById('sub-id', mockUser);
            expect(subscriptionRepo.findOne).toHaveBeenCalledWith({
                where: { id: 'sub-id' },
                relations: ['owner', 'invoices', 'invoices.uploadedBy', 'invoices.verifiedBy']
            });
            expect(result).toEqual(mockSubscription);
        });
        it('should throw NotFoundException if subscription not found', async () => {
            mockSubscriptionRepo.findOne.mockResolvedValue(null);
            await expect(service.findById('non-existent', mockUser))
                .rejects.toThrow(common_1.NotFoundException);
        });
        it('should throw ForbiddenException if employee tries to access others subscription', async () => {
            const employeeUser = { ...mockUser, role: user_entity_1.UserRole.EMPLOYEE, id: 'different-id' };
            mockSubscriptionRepo.findOne.mockResolvedValue(mockSubscription);
            await expect(service.findById('sub-id', employeeUser))
                .rejects.toThrow(common_1.ForbiddenException);
        });
    });
    describe('update', () => {
        const mockUser = {
            id: 'user-id',
            role: user_entity_1.UserRole.ADMIN,
        };
        const mockSubscription = {
            id: 'sub-id',
            name: 'Test Subscription',
            ownerId: 'user-id',
            price: 29.99,
        };
        beforeEach(() => {
            jest.spyOn(service, 'findById').mockResolvedValue(mockSubscription);
        });
        it('should update subscription successfully', async () => {
            const updateData = { price: 39.99, name: 'Updated Subscription' };
            const updatedSubscription = { ...mockSubscription, ...updateData };
            mockSubscriptionRepo.save.mockResolvedValue(updatedSubscription);
            const result = await service.update('sub-id', updateData, mockUser);
            expect(service.findById).toHaveBeenCalledWith('sub-id', mockUser);
            expect(subscriptionRepo.save).toHaveBeenCalledWith(updatedSubscription);
            expect(result).toEqual(updatedSubscription);
        });
        it('should throw BadRequestException for negative price', async () => {
            const updateData = { price: -10 };
            await expect(service.update('sub-id', updateData, mockUser))
                .rejects.toThrow(common_1.BadRequestException);
        });
        it('should throw BadRequestException for invalid billing frequency', async () => {
            const updateData = { billingFrequency: 'Weekly' };
            await expect(service.update('sub-id', updateData, mockUser))
                .rejects.toThrow(common_1.BadRequestException);
        });
        it('should throw BadRequestException for invalid payment method', async () => {
            const updateData = { paymentMethod: 'Cash' };
            await expect(service.update('sub-id', updateData, mockUser))
                .rejects.toThrow(common_1.BadRequestException);
        });
    });
    describe('exportSubscriptions', () => {
        const adminUser = {
            id: 'admin-id',
            role: user_entity_1.UserRole.ADMIN,
        };
        const nonAdminUser = {
            id: 'user-id',
            role: user_entity_1.UserRole.EMPLOYEE,
        };
        it('should throw ForbiddenException for non-admin users', async () => {
            await expect(service.exportSubscriptions('csv', {}, nonAdminUser))
                .rejects.toThrow(common_1.ForbiddenException);
        });
        it('should throw BadRequestException for invalid date range', async () => {
            const filters = {
                startDate: new Date('2024-12-31'),
                endDate: new Date('2024-01-01'),
            };
            await expect(service.exportSubscriptions('csv', filters, adminUser))
                .rejects.toThrow(common_1.BadRequestException);
        });
        it('should throw BadRequestException for invalid export format', async () => {
            const mockQueryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getCount: jest.fn().mockResolvedValue(0),
            };
            mockSubscriptionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
            await expect(service.exportSubscriptions('xml', {}, adminUser))
                .rejects.toThrow(common_1.BadRequestException);
        });
    });
    describe('validation helpers', () => {
        it('should validate email format correctly', () => {
            const isValidEmail = service.isValidEmail;
            expect(isValidEmail('test@example.com')).toBe(true);
            expect(isValidEmail('user.name+tag@example.com')).toBe(true);
            expect(isValidEmail('invalid-email')).toBe(false);
            expect(isValidEmail('user@')).toBe(false);
            expect(isValidEmail('@example.com')).toBe(false);
        });
        it('should validate UUID format correctly', () => {
            const isValidUUID = service.isValidUUID;
            expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
            expect(isValidUUID('invalid-uuid')).toBe(false);
            expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
        });
    });
});
//# sourceMappingURL=subscription.service.spec.js.map