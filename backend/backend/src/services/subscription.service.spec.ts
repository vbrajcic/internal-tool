import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionService } from './subscription.service';
import { Subscription, BillingFrequency, PaymentMethod } from '../models/subscription.entity';
import { Invoice } from '../models/invoice.entity';
import { User, UserRole } from '../models/user.entity';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let subscriptionRepo: Repository<Subscription>;
  let invoiceRepo: Repository<Invoice>;
  let userRepo: Repository<User>;

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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockSubscriptionRepo,
        },
        {
          provide: getRepositoryToken(Invoice),
          useValue: mockInvoiceRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    subscriptionRepo = module.get<Repository<Subscription>>(getRepositoryToken(Subscription));
    invoiceRepo = module.get<Repository<Invoice>>(getRepositoryToken(Invoice));
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@company.com',
      role: UserRole.ADMIN,
    } as User;

    const mockOwner = {
      id: 'owner-id',
      email: 'owner@company.com',
    } as User;

    const createSubscriptionDto = {
      name: 'Test Subscription',
      price: 29.99,
      billingFrequency: BillingFrequency.MONTHLY,
      paymentMethod: PaymentMethod.COMPANY_CARD,
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
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if owner email does not match', async () => {
      const wrongOwner = { ...mockOwner, email: 'wrong@company.com' };
      mockUserRepo.findOne.mockResolvedValue(wrongOwner);

      await expect(service.create(createSubscriptionDto, mockUser))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if employee tries to create for someone else', async () => {
      const employeeUser = { ...mockUser, role: UserRole.EMPLOYEE, id: 'different-id' };
      mockUserRepo.findOne.mockResolvedValue(mockOwner);

      await expect(service.create(createSubscriptionDto, employeeUser))
        .rejects.toThrow(ForbiddenException);
    });

    it('should validate negative price', async () => {
      const invalidDto = { ...createSubscriptionDto, price: -10 };
      mockUserRepo.findOne.mockResolvedValue(mockOwner);

      await expect(service.create(invalidDto, mockUser))
        .rejects.toThrow(BadRequestException);
    });

    it('should validate invalid email format', async () => {
      const invalidDto = { ...createSubscriptionDto, ownerEmail: 'invalid-email' };
      mockUserRepo.findOne.mockResolvedValue({ ...mockOwner, email: 'invalid-email' });

      await expect(service.create(invalidDto, mockUser))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    const mockUser = {
      id: 'user-id',
      role: UserRole.ADMIN,
    } as User;

    const mockSubscription = {
      id: 'sub-id',
      name: 'Test Subscription',
      ownerId: 'owner-id',
    } as Subscription;

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
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if employee tries to access others subscription', async () => {
      const employeeUser = { ...mockUser, role: UserRole.EMPLOYEE, id: 'different-id' };
      mockSubscriptionRepo.findOne.mockResolvedValue(mockSubscription);

      await expect(service.findById('sub-id', employeeUser))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const mockUser = {
      id: 'user-id',
      role: UserRole.ADMIN,
    } as User;

    const mockSubscription = {
      id: 'sub-id',
      name: 'Test Subscription',
      ownerId: 'user-id',
      price: 29.99,
    } as Subscription;

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
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid billing frequency', async () => {
      const updateData = { billingFrequency: 'Weekly' as any };

      await expect(service.update('sub-id', updateData, mockUser))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid payment method', async () => {
      const updateData = { paymentMethod: 'Cash' as any };

      await expect(service.update('sub-id', updateData, mockUser))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('exportSubscriptions', () => {
    const adminUser = {
      id: 'admin-id',
      role: UserRole.ADMIN,
    } as User;

    const nonAdminUser = {
      id: 'user-id',
      role: UserRole.EMPLOYEE,
    } as User;

    it('should throw ForbiddenException for non-admin users', async () => {
      await expect(service.exportSubscriptions('csv', {}, nonAdminUser))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid date range', async () => {
      const filters = {
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01'),
      };

      await expect(service.exportSubscriptions('csv', filters, adminUser))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid export format', async () => {
      // Mock the query builder to return empty subscriptions
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockSubscriptionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await expect(service.exportSubscriptions('xml' as any, {}, adminUser))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('validation helpers', () => {
    it('should validate email format correctly', () => {
      // Access private method for testing
      const isValidEmail = (service as any).isValidEmail;

      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@example.com')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });

    it('should validate UUID format correctly', () => {
      // Access private method for testing
      const isValidUUID = (service as any).isValidUUID;

      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('invalid-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
    });
  });
});