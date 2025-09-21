import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

describe('Requests API Contract Tests (T017)', () => {
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

  describe('GET /api/requests', () => {
    it('should return paginated list of requests for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body).toHaveProperty('requests');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.requests)).toBe(true);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('pages');
    });

    it('should filter requests by status when provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests?status=Submitted')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body.requests).toBeDefined();
      response.body.requests.forEach((req: any) => {
        expect(req.status).toBe('Submitted');
      });
    });

    it('should filter requests by requesterId when provided', async () => {
      const requesterId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app.getHttpServer())
        .get(`/api/requests?requesterId=${requesterId}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body.requests).toBeDefined();
      response.body.requests.forEach((req: any) => {
        expect(req.requesterId).toBe(requesterId);
      });
    });

    it('should filter requests by teamLeadId when provided', async () => {
      const teamLeadId = '550e8400-e29b-41d4-a716-446655440001';
      const response = await request(app.getHttpServer())
        .get(`/api/requests?teamLeadId=${teamLeadId}`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .expect(200);

      expect(response.body.requests).toBeDefined();
      response.body.requests.forEach((req: any) => {
        expect(req.teamLeadId).toBe(teamLeadId);
      });
    });

    it('should support pagination with page and limit parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests?page=1&limit=10')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.requests.length).toBeLessThanOrEqual(10);
    });

    it('should validate status enum values', async () => {
      await request(app.getHttpServer())
        .get('/api/requests?status=InvalidStatus')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(400);
    });

    it('should validate pagination parameters', async () => {
      await request(app.getHttpServer())
        .get('/api/requests?page=0&limit=101')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/requests')
        .expect(401);
    });

    it('should apply role-based filtering for Employee role', async () => {
      // Employee should only see their own requests
      const response = await request(app.getHttpServer())
        .get('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .expect(200);

      expect(response.body.requests).toBeDefined();
      // All returned requests should belong to the authenticated employee
      response.body.requests.forEach((req: any) => {
        expect(req.requesterId).toBe('employee-user-id');
      });
    });

    it('should apply role-based filtering for TeamLead role', async () => {
      // TeamLead should see requests from their team members
      const response = await request(app.getHttpServer())
        .get('/api/requests')
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .expect(200);

      expect(response.body.requests).toBeDefined();
      // All returned requests should be from team members or assigned to this team lead
    });

    it('should allow Admin to see all requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/requests')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(response.body.requests).toBeDefined();
      // Admin should see all requests without filtering
    });
  });

  describe('POST /api/requests', () => {
    it('should submit equipment request with valid data', async () => {
      const requestData = {
        equipmentType: 'Laptop',
        justification: 'Need a laptop for development work on new project assignments',
        specifications: 'MacBook Pro 16-inch, 32GB RAM, 1TB SSD'
      };

      const response = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(requestData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.equipmentType).toBe(requestData.equipmentType);
      expect(response.body.justification).toBe(requestData.justification);
      expect(response.body.specifications).toBe(requestData.specifications);
      expect(response.body.status).toBe('Submitted');
      expect(response.body.teamLeadDecision).toBe('Pending');
      expect(response.body).toHaveProperty('requesterId');
      expect(response.body).toHaveProperty('teamLeadId');
      expect(response.body).toHaveProperty('requestedAt');
    });

    it('should submit request with minimal required data', async () => {
      const requestData = {
        equipmentType: 'Display',
        justification: 'Need external monitor for better productivity and ergonomics'
      };

      const response = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(requestData)
        .expect(201);

      expect(response.body.equipmentType).toBe(requestData.equipmentType);
      expect(response.body.justification).toBe(requestData.justification);
      expect(response.body.specifications).toBeNull();
      expect(response.body.status).toBe('Submitted');
    });

    it('should require equipmentType field', async () => {
      const incompleteData = {
        justification: 'Need equipment for work'
      };

      await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(incompleteData)
        .expect(400);
    });

    it('should require justification field', async () => {
      const incompleteData = {
        equipmentType: 'Laptop'
      };

      await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(incompleteData)
        .expect(400);
    });

    it('should validate equipmentType enum values', async () => {
      const invalidData = {
        equipmentType: 'InvalidType',
        justification: 'Need equipment for work purposes and daily tasks'
      };

      await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(invalidData)
        .expect(400);
    });

    it('should validate justification minimum length', async () => {
      const invalidData = {
        equipmentType: 'Laptop',
        justification: 'Short'
      };

      await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(invalidData)
        .expect(400);
    });

    it('should accept all valid equipment types', async () => {
      const equipmentTypes = ['Laptop', 'Display', 'Phone', 'Tablet', 'Dongle', 'Keyboard', 'Mouse', 'Furniture'];

      for (const equipmentType of equipmentTypes) {
        const requestData = {
          equipmentType,
          justification: `Need ${equipmentType} for work productivity and efficiency improvements`
        };

        const response = await request(app.getHttpServer())
          .post('/api/requests')
          .set('Authorization', 'Bearer employee-jwt-token')
          .send(requestData)
          .expect(201);

        expect(response.body.equipmentType).toBe(equipmentType);
      }
    });

    it('should require authentication', async () => {
      const requestData = {
        equipmentType: 'Laptop',
        justification: 'Need equipment for work'
      };

      await request(app.getHttpServer())
        .post('/api/requests')
        .send(requestData)
        .expect(401);
    });

    it('should automatically assign team lead based on requester team', async () => {
      const requestData = {
        equipmentType: 'Laptop',
        justification: 'Need laptop for development work and project collaboration'
      };

      const response = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(requestData)
        .expect(201);

      expect(response.body.teamLeadId).toBeDefined();
      expect(response.body.teamLeadId).not.toBeNull();
    });

    it('should allow all roles to submit requests', async () => {
      const requestData = {
        equipmentType: 'Display',
        justification: 'Need additional monitor for enhanced productivity'
      };

      // Employee can submit
      const employeeResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(requestData)
        .expect(201);

      expect(employeeResponse.body.status).toBe('Submitted');

      // TeamLead can submit
      const teamLeadResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send(requestData)
        .expect(201);

      expect(teamLeadResponse.body.status).toBe('Submitted');

      // Admin can submit
      const adminResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(requestData)
        .expect(201);

      expect(adminResponse.body.status).toBe('Submitted');
    });

    it('should handle long specifications field', async () => {
      const requestData = {
        equipmentType: 'Laptop',
        justification: 'Need high-performance laptop for development and testing',
        specifications: 'MacBook Pro 16-inch with M2 Max chip, 64GB unified memory, 2TB SSD storage, additional external GPU requirements for machine learning workloads, multiple display support, and extended battery life for remote work scenarios'
      };

      const response = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(requestData)
        .expect(201);

      expect(response.body.specifications).toBe(requestData.specifications);
    });
  });
});