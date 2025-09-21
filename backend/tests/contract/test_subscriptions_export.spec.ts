import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

describe('Subscriptions Export Contract Tests (T016)', () => {
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

  describe('GET /api/subscriptions/export', () => {
    it('should export subscriptions in CSV format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=csv')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/octet-stream');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.csv');
      expect(Buffer.isBuffer(response.body) || typeof response.body === 'string').toBe(true);
    });

    it('should export subscriptions in Excel format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=excel')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/octet-stream');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.xlsx');
      expect(Buffer.isBuffer(response.body)).toBe(true);
    });

    it('should export subscriptions in PDF format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=pdf')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/octet-stream');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.pdf');
      expect(Buffer.isBuffer(response.body)).toBe(true);
    });

    it('should require format parameter', async () => {
      await request(app.getHttpServer())
        .get('/api/subscriptions/export')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(400);
    });

    it('should validate format parameter values', async () => {
      await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=xml')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(400);
    });

    it('should filter by date range when provided', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      const response = await request(app.getHttpServer())
        .get(`/api/subscriptions/export?format=csv&startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/octet-stream');
    });

    it('should filter by payment method when provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=csv&paymentMethod=CompanyCard')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/octet-stream');
    });

    it('should validate date format for startDate', async () => {
      await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=csv&startDate=invalid-date')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(400);
    });

    it('should validate date format for endDate', async () => {
      await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=csv&endDate=invalid-date')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(400);
    });

    it('should validate paymentMethod values', async () => {
      await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=csv&paymentMethod=InvalidMethod')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=csv')
        .expect(401);
    });

    it('should require Admin role for export functionality', async () => {
      // Employee should not have access to export
      await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=csv')
        .set('Authorization', 'Bearer employee-jwt-token')
        .expect(403);
    });

    it('should require Admin role - TeamLead should not have access', async () => {
      // TeamLead should not have access to full export
      await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=csv')
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .expect(403);
    });

    it('should generate proper filename with timestamp for CSV export', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=csv')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      const contentDisposition = response.headers['content-disposition'];
      expect(contentDisposition).toMatch(/subscriptions_export_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.csv/);
    });

    it('should generate proper filename with timestamp for Excel export', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=excel')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      const contentDisposition = response.headers['content-disposition'];
      expect(contentDisposition).toMatch(/subscriptions_export_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.xlsx/);
    });

    it('should generate proper filename with timestamp for PDF export', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=pdf')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      const contentDisposition = response.headers['content-disposition'];
      expect(contentDisposition).toMatch(/subscriptions_export_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.pdf/);
    });

    it('should include comprehensive subscription data in export', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=csv')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      // For CSV, check that the response contains expected column headers
      const csvContent = response.body.toString();
      expect(csvContent).toContain('name');
      expect(csvContent).toContain('price');
      expect(csvContent).toContain('billingFrequency');
      expect(csvContent).toContain('paymentMethod');
      expect(csvContent).toContain('ownerEmail');
      expect(csvContent).toContain('renewalDate');
      expect(csvContent).toContain('isActive');
      expect(csvContent).toContain('createdAt');
    });

    it('should handle empty dataset gracefully', async () => {
      // Export when no subscriptions match the filter criteria
      const response = await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=csv&startDate=2030-01-01&endDate=2030-12-31')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/octet-stream');
      // Should still return a valid file with headers even if no data
      const csvContent = response.body.toString();
      expect(csvContent.split('\n').length).toBeGreaterThanOrEqual(1); // At least header row
    });

    it('should support date range filtering with proper validation', async () => {
      const startDate = '2024-06-01';
      const endDate = '2024-05-31'; // End date before start date

      await request(app.getHttpServer())
        .get(`/api/subscriptions/export?format=csv&startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(400); // Should validate that end date is after start date
    });

    it('should optimize for large datasets without timeout', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=csv')
        .set('Authorization', 'Bearer admin-jwt-token')
        .timeout(30000) // 30 second timeout for large exports
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(30000); // Should complete within timeout
      expect(response.headers['content-type']).toContain('application/octet-stream');
    });
  });
});