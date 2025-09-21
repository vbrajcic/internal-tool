import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

describe('Subscriptions CRUD Contract Tests (T015)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let testSubscriptionId: string;

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

    // Create a test subscription for CRUD operations
    const subscriptionData = {
      name: 'Test CRUD Subscription',
      price: 29.99,
      billingFrequency: 'Monthly',
      paymentMethod: 'CompanyCard',
      ownerId: '550e8400-e29b-41d4-a716-446655440000',
      ownerEmail: 'crud.test@company.com'
    };

    const createResponse = await request(app.getHttpServer())
      .post('/api/subscriptions')
      .set('Authorization', 'Bearer valid-jwt-token')
      .send(subscriptionData);

    testSubscriptionId = createResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PUT /api/subscriptions/{id}', () => {
    it('should update subscription with valid data', async () => {
      const updateData = {
        name: 'Updated Subscription Name',
        price: 39.99,
        billingFrequency: 'Yearly',
        paymentMethod: 'PersonalReimbursed',
        renewalDate: '2024-12-31',
        isActive: true
      };

      const response = await request(app.getHttpServer())
        .put(`/api/subscriptions/${testSubscriptionId}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(updateData)
        .expect(200);

      expect(response.body.id).toBe(testSubscriptionId);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.price).toBe(updateData.price);
      expect(response.body.billingFrequency).toBe(updateData.billingFrequency);
      expect(response.body.paymentMethod).toBe(updateData.paymentMethod);
      expect(response.body.isActive).toBe(updateData.isActive);
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should allow partial updates', async () => {
      const partialUpdate = {
        price: 49.99
      };

      const response = await request(app.getHttpServer())
        .put(`/api/subscriptions/${testSubscriptionId}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(partialUpdate)
        .expect(200);

      expect(response.body.price).toBe(partialUpdate.price);
      expect(response.body.name).toBeDefined(); // Should retain existing value
    });

    it('should validate price is non-negative when updating', async () => {
      const invalidUpdate = {
        price: -15.00
      };

      await request(app.getHttpServer())
        .put(`/api/subscriptions/${testSubscriptionId}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(invalidUpdate)
        .expect(400);
    });

    it('should validate billingFrequency enum values when updating', async () => {
      const invalidUpdate = {
        billingFrequency: 'Quarterly'
      };

      await request(app.getHttpServer())
        .put(`/api/subscriptions/${testSubscriptionId}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(invalidUpdate)
        .expect(400);
    });

    it('should validate paymentMethod enum values when updating', async () => {
      const invalidUpdate = {
        paymentMethod: 'Cash'
      };

      await request(app.getHttpServer())
        .put(`/api/subscriptions/${testSubscriptionId}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(invalidUpdate)
        .expect(400);
    });

    it('should return 404 for non-existent subscription', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
      const updateData = {
        price: 19.99
      };

      await request(app.getHttpServer())
        .put(`/api/subscriptions/${nonExistentId}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(updateData)
        .expect(404);
    });

    it('should require authentication', async () => {
      const updateData = {
        price: 19.99
      };

      await request(app.getHttpServer())
        .put(`/api/subscriptions/${testSubscriptionId}`)
        .send(updateData)
        .expect(401);
    });

    it('should enforce role-based access for Employee role', async () => {
      const updateData = {
        price: 19.99
      };

      // Employee should only update their own subscriptions
      await request(app.getHttpServer())
        .put(`/api/subscriptions/${testSubscriptionId}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(updateData)
        .expect(403); // Assuming this subscription belongs to someone else
    });

    it('should allow TeamLead to update team member subscriptions', async () => {
      const updateData = {
        price: 25.99
      };

      const response = await request(app.getHttpServer())
        .put(`/api/subscriptions/${testSubscriptionId}`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send(updateData)
        .expect(200);

      expect(response.body.price).toBe(updateData.price);
    });

    it('should allow Admin to update any subscription', async () => {
      const updateData = {
        price: 35.99,
        isActive: false
      };

      const response = await request(app.getHttpServer())
        .put(`/api/subscriptions/${testSubscriptionId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(updateData)
        .expect(200);

      expect(response.body.price).toBe(updateData.price);
      expect(response.body.isActive).toBe(updateData.isActive);
    });
  });

  describe('GET /api/subscriptions/{id}/invoices', () => {
    it('should return invoices for subscription', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/subscriptions/${testSubscriptionId}/invoices`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Initially should be empty array since no invoices uploaded yet
      expect(response.body.length).toBe(0);
    });

    it('should return 404 for non-existent subscription', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';

      await request(app.getHttpServer())
        .get(`/api/subscriptions/${nonExistentId}/invoices`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/subscriptions/${testSubscriptionId}/invoices`)
        .expect(401);
    });

    it('should enforce role-based access for invoices', async () => {
      // Employee should only see invoices for their own subscriptions
      await request(app.getHttpServer())
        .get(`/api/subscriptions/${testSubscriptionId}/invoices`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .expect(403);
    });
  });

  describe('POST /api/subscriptions/{id}/invoices', () => {
    it('should upload PDF invoice with file data', async () => {
      const invoiceBuffer = Buffer.from('fake-pdf-content');

      const response = await request(app.getHttpServer())
        .post(`/api/subscriptions/${testSubscriptionId}/invoices`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .attach('file', invoiceBuffer, 'test-invoice.pdf')
        .field('amount', '29.99')
        .field('invoiceDate', '2024-01-15')
        .field('description', 'Monthly subscription fee')
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.subscriptionId).toBe(testSubscriptionId);
      expect(response.body.fileName).toBe('test-invoice.pdf');
      expect(response.body.amount).toBe(29.99);
      expect(response.body.description).toBe('Monthly subscription fee');
      expect(response.body.isVerified).toBe(false);
      expect(response.body).toHaveProperty('uploadedAt');
      expect(response.body).toHaveProperty('filePath'); // S3 key
    });

    it('should upload invoice with minimal data (file only)', async () => {
      const invoiceBuffer = Buffer.from('minimal-pdf-content');

      const response = await request(app.getHttpServer())
        .post(`/api/subscriptions/${testSubscriptionId}/invoices`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .attach('file', invoiceBuffer, 'minimal-invoice.pdf')
        .expect(201);

      expect(response.body.subscriptionId).toBe(testSubscriptionId);
      expect(response.body.fileName).toBe('minimal-invoice.pdf');
      expect(response.body.amount).toBeNull();
      expect(response.body.invoiceDate).toBeNull();
      expect(response.body.description).toBeNull();
    });

    it('should reject non-PDF file types', async () => {
      const textBuffer = Buffer.from('not-a-pdf');

      await request(app.getHttpServer())
        .post(`/api/subscriptions/${testSubscriptionId}/invoices`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .attach('file', textBuffer, 'invalid.txt')
        .expect(400);
    });

    it('should validate file is required', async () => {
      await request(app.getHttpServer())
        .post(`/api/subscriptions/${testSubscriptionId}/invoices`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .field('amount', '29.99')
        .expect(400);
    });

    it('should validate amount format when provided', async () => {
      const invoiceBuffer = Buffer.from('valid-pdf-content');

      await request(app.getHttpServer())
        .post(`/api/subscriptions/${testSubscriptionId}/invoices`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .attach('file', invoiceBuffer, 'test.pdf')
        .field('amount', 'invalid-amount')
        .expect(400);
    });

    it('should validate date format when provided', async () => {
      const invoiceBuffer = Buffer.from('valid-pdf-content');

      await request(app.getHttpServer())
        .post(`/api/subscriptions/${testSubscriptionId}/invoices`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .attach('file', invoiceBuffer, 'test.pdf')
        .field('invoiceDate', 'invalid-date')
        .expect(400);
    });

    it('should return 404 for non-existent subscription', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
      const invoiceBuffer = Buffer.from('test-pdf');

      await request(app.getHttpServer())
        .post(`/api/subscriptions/${nonExistentId}/invoices`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .attach('file', invoiceBuffer, 'test.pdf')
        .expect(404);
    });

    it('should require authentication', async () => {
      const invoiceBuffer = Buffer.from('test-pdf');

      await request(app.getHttpServer())
        .post(`/api/subscriptions/${testSubscriptionId}/invoices`)
        .attach('file', invoiceBuffer, 'test.pdf')
        .expect(401);
    });

    it('should enforce role-based access for invoice uploads', async () => {
      const invoiceBuffer = Buffer.from('employee-pdf');

      // Employee should only upload invoices for their own subscriptions
      await request(app.getHttpServer())
        .post(`/api/subscriptions/${testSubscriptionId}/invoices`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .attach('file', invoiceBuffer, 'employee-test.pdf')
        .expect(403);
    });

    it('should allow TeamLead to upload invoices for team member subscriptions', async () => {
      const invoiceBuffer = Buffer.from('team-lead-pdf');

      const response = await request(app.getHttpServer())
        .post(`/api/subscriptions/${testSubscriptionId}/invoices`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .attach('file', invoiceBuffer, 'team-lead-test.pdf')
        .expect(201);

      expect(response.body.subscriptionId).toBe(testSubscriptionId);
    });

    it('should allow Admin to upload invoices for any subscription', async () => {
      const invoiceBuffer = Buffer.from('admin-pdf');

      const response = await request(app.getHttpServer())
        .post(`/api/subscriptions/${testSubscriptionId}/invoices`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .attach('file', invoiceBuffer, 'admin-test.pdf')
        .field('amount', '99.99')
        .expect(201);

      expect(response.body.subscriptionId).toBe(testSubscriptionId);
      expect(response.body.amount).toBe(99.99);
    });
  });
});