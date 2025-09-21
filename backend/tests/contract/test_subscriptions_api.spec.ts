import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

describe('Subscriptions API Contract Tests (T014)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT) || 5432,
          username: process.env.DB_USERNAME || 'test',
          password: process.env.DB_PASSWORD || 'test',
          database: process.env.DB_NAME || 'test_db',
          entities: [__dirname + '/../../src/models/*.entity{.ts,.js}'],
          synchronize: true,
          dropSchema: true,
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/subscriptions', () => {
    it('should return paginated list of subscriptions for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/subscriptions')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body).toHaveProperty('subscriptions');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.subscriptions)).toBe(true);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('pages');
    });

    it('should filter subscriptions by ownerId when provided', async () => {
      const ownerId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app.getHttpServer())
        .get(`/api/subscriptions?ownerId=${ownerId}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body.subscriptions).toBeDefined();
      response.body.subscriptions.forEach((subscription: any) => {
        expect(subscription.ownerId).toBe(ownerId);
      });
    });

    it('should filter subscriptions by isActive status when provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/subscriptions?isActive=true')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body.subscriptions).toBeDefined();
      response.body.subscriptions.forEach((subscription: any) => {
        expect(subscription.isActive).toBe(true);
      });
    });

    it('should filter subscriptions by paymentMethod when provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/subscriptions?paymentMethod=CompanyCard')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body.subscriptions).toBeDefined();
      response.body.subscriptions.forEach((subscription: any) => {
        expect(subscription.paymentMethod).toBe('CompanyCard');
      });
    });

    it('should support pagination with page and limit parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/subscriptions?page=1&limit=10')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.subscriptions.length).toBeLessThanOrEqual(10);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/subscriptions')
        .expect(401);
    });

    it('should reject invalid paymentMethod values', async () => {
      await request(app.getHttpServer())
        .get('/api/subscriptions?paymentMethod=InvalidMethod')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(400);
    });

    it('should validate pagination parameters', async () => {
      await request(app.getHttpServer())
        .get('/api/subscriptions?page=0&limit=101')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(400);
    });
  });

  describe('POST /api/subscriptions', () => {
    it('should register new subscription with valid data', async () => {
      const subscriptionData = {
        name: 'Adobe Creative Suite',
        price: 52.99,
        billingFrequency: 'Monthly',
        paymentMethod: 'CompanyCard',
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        ownerEmail: 'john.doe@company.com',
        renewalDate: '2024-12-31'
      };

      const response = await request(app.getHttpServer())
        .post('/api/subscriptions')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(subscriptionData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(subscriptionData.name);
      expect(response.body.price).toBe(subscriptionData.price);
      expect(response.body.billingFrequency).toBe(subscriptionData.billingFrequency);
      expect(response.body.paymentMethod).toBe(subscriptionData.paymentMethod);
      expect(response.body.ownerId).toBe(subscriptionData.ownerId);
      expect(response.body.ownerEmail).toBe(subscriptionData.ownerEmail);
      expect(response.body.isActive).toBe(true);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should require all mandatory fields', async () => {
      const incompleteData = {
        name: 'Incomplete Subscription'
      };

      await request(app.getHttpServer())
        .post('/api/subscriptions')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(incompleteData)
        .expect(400);
    });

    it('should validate price is non-negative', async () => {
      const invalidData = {
        name: 'Free Software',
        price: -10.00,
        billingFrequency: 'Monthly',
        paymentMethod: 'CompanyCard',
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        ownerEmail: 'john.doe@company.com'
      };

      await request(app.getHttpServer())
        .post('/api/subscriptions')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(invalidData)
        .expect(400);
    });

    it('should validate billingFrequency enum values', async () => {
      const invalidData = {
        name: 'Test Subscription',
        price: 29.99,
        billingFrequency: 'Weekly',
        paymentMethod: 'CompanyCard',
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        ownerEmail: 'john.doe@company.com'
      };

      await request(app.getHttpServer())
        .post('/api/subscriptions')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(invalidData)
        .expect(400);
    });

    it('should validate paymentMethod enum values', async () => {
      const invalidData = {
        name: 'Test Subscription',
        price: 29.99,
        billingFrequency: 'Monthly',
        paymentMethod: 'CreditCard',
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        ownerEmail: 'john.doe@company.com'
      };

      await request(app.getHttpServer())
        .post('/api/subscriptions')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(invalidData)
        .expect(400);
    });

    it('should validate email format', async () => {
      const invalidData = {
        name: 'Test Subscription',
        price: 29.99,
        billingFrequency: 'Monthly',
        paymentMethod: 'CompanyCard',
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        ownerEmail: 'invalid-email'
      };

      await request(app.getHttpServer())
        .post('/api/subscriptions')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(invalidData)
        .expect(400);
    });

    it('should validate UUID format for ownerId', async () => {
      const invalidData = {
        name: 'Test Subscription',
        price: 29.99,
        billingFrequency: 'Monthly',
        paymentMethod: 'CompanyCard',
        ownerId: 'invalid-uuid',
        ownerEmail: 'john.doe@company.com'
      };

      await request(app.getHttpServer())
        .post('/api/subscriptions')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(invalidData)
        .expect(400);
    });

    it('should require authentication', async () => {
      const subscriptionData = {
        name: 'Test Subscription',
        price: 29.99,
        billingFrequency: 'Monthly',
        paymentMethod: 'CompanyCard',
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        ownerEmail: 'john.doe@company.com'
      };

      await request(app.getHttpServer())
        .post('/api/subscriptions')
        .send(subscriptionData)
        .expect(401);
    });

    it('should handle TeamLead role-based access for their team members', async () => {
      const subscriptionData = {
        name: 'Team Software License',
        price: 99.99,
        billingFrequency: 'Monthly',
        paymentMethod: 'CompanyCard',
        ownerId: '550e8400-e29b-41d4-a716-446655440001',
        ownerEmail: 'team.member@company.com'
      };

      const response = await request(app.getHttpServer())
        .post('/api/subscriptions')
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send(subscriptionData)
        .expect(201);

      expect(response.body.ownerId).toBe(subscriptionData.ownerId);
    });

    it('should allow Admin to create subscriptions for any user', async () => {
      const subscriptionData = {
        name: 'Enterprise License',
        price: 199.99,
        billingFrequency: 'Yearly',
        paymentMethod: 'CompanyCard',
        ownerId: '550e8400-e29b-41d4-a716-446655440002',
        ownerEmail: 'any.user@company.com'
      };

      const response = await request(app.getHttpServer())
        .post('/api/subscriptions')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(subscriptionData)
        .expect(201);

      expect(response.body.ownerId).toBe(subscriptionData.ownerId);
    });
  });
});