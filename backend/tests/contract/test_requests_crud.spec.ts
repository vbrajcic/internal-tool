import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

describe('Requests CRUD Contract Tests (T018)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let testRequestId: string;

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

    // Create a test request for CRUD operations
    const requestData = {
      equipmentType: 'Laptop',
      justification: 'Test request for CRUD operations and validation testing'
    };

    const createResponse = await request(app.getHttpServer())
      .post('/api/requests')
      .set('Authorization', 'Bearer employee-jwt-token')
      .send(requestData);

    testRequestId = createResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/requests/{id}', () => {
    it('should return request details with full information', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/requests/${testRequestId}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .expect(200);

      expect(response.body.id).toBe(testRequestId);
      expect(response.body).toHaveProperty('equipmentType');
      expect(response.body).toHaveProperty('justification');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('teamLeadDecision');
      expect(response.body).toHaveProperty('requesterId');
      expect(response.body).toHaveProperty('teamLeadId');
      expect(response.body).toHaveProperty('requestedAt');

      // Should include detailed user information
      expect(response.body).toHaveProperty('requester');
      expect(response.body.requester).toHaveProperty('id');
      expect(response.body.requester).toHaveProperty('email');
      expect(response.body.requester).toHaveProperty('firstName');
      expect(response.body.requester).toHaveProperty('lastName');
      expect(response.body.requester).toHaveProperty('role');

      // Should include team lead information
      expect(response.body).toHaveProperty('teamLead');
      expect(response.body.teamLead).toHaveProperty('id');
      expect(response.body.teamLead).toHaveProperty('email');
    });

    it('should return 404 for non-existent request', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';

      await request(app.getHttpServer())
        .get(`/api/requests/${nonExistentId}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/requests/${testRequestId}`)
        .expect(401);
    });

    it('should enforce role-based access for Employee role', async () => {
      // Employee should only access their own requests
      await request(app.getHttpServer())
        .get(`/api/requests/${testRequestId}`)
        .set('Authorization', 'Bearer other-employee-jwt-token')
        .expect(403);
    });

    it('should allow TeamLead to access team member requests', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/requests/${testRequestId}`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .expect(200);

      expect(response.body.id).toBe(testRequestId);
    });

    it('should allow Admin to access any request', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/requests/${testRequestId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(response.body.id).toBe(testRequestId);
    });

    it('should include assignedEquipment when request is fulfilled', async () => {
      // This test assumes the request will be fulfilled in later tests
      const response = await request(app.getHttpServer())
        .get(`/api/requests/${testRequestId}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .expect(200);

      if (response.body.status === 'Fulfilled') {
        expect(response.body).toHaveProperty('assignedEquipment');
        expect(response.body.assignedEquipment).toHaveProperty('id');
        expect(response.body.assignedEquipment).toHaveProperty('serialNumber');
        expect(response.body.assignedEquipment).toHaveProperty('brand');
        expect(response.body.assignedEquipment).toHaveProperty('model');
        expect(response.body.assignedEquipment).toHaveProperty('type');
      } else {
        expect(response.body.assignedEquipment).toBeNull();
      }
    });
  });

  describe('PUT /api/requests/{id}', () => {
    it('should update request justification when in Submitted status', async () => {
      const updateData = {
        justification: 'Updated justification with more detailed requirements for the equipment request'
      };

      const response = await request(app.getHttpServer())
        .put(`/api/requests/${testRequestId}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(updateData)
        .expect(200);

      expect(response.body.id).toBe(testRequestId);
      expect(response.body.justification).toBe(updateData.justification);
      expect(response.body.status).toBe('Submitted'); // Should remain in submitted status
    });

    it('should update request specifications when in Submitted status', async () => {
      const updateData = {
        specifications: 'Updated specifications: MacBook Pro 14-inch, M2 chip, 16GB RAM, 512GB SSD'
      };

      const response = await request(app.getHttpServer())
        .put(`/api/requests/${testRequestId}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(updateData)
        .expect(200);

      expect(response.body.specifications).toBe(updateData.specifications);
    });

    it('should update both justification and specifications', async () => {
      const updateData = {
        justification: 'Complete update of justification for better clarity and requirements',
        specifications: 'Complete specs: MacBook Pro 16-inch, M2 Max, 32GB RAM, 1TB SSD, additional peripherals'
      };

      const response = await request(app.getHttpServer())
        .put(`/api/requests/${testRequestId}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(updateData)
        .expect(200);

      expect(response.body.justification).toBe(updateData.justification);
      expect(response.body.specifications).toBe(updateData.specifications);
    });

    it('should validate justification minimum length when updating', async () => {
      const invalidUpdate = {
        justification: 'Short'
      };

      await request(app.getHttpServer())
        .put(`/api/requests/${testRequestId}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(invalidUpdate)
        .expect(400);
    });

    it('should prevent updates when request is not in Submitted status', async () => {
      // First, simulate moving the request to TeamLeadReview status
      // This would normally happen through the team-lead-review endpoint

      const updateData = {
        justification: 'Trying to update after submission review has started'
      };

      // Create a new request and try to update it after it's been reviewed
      const newRequestData = {
        equipmentType: 'Display',
        justification: 'Need display for testing update restrictions'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // Simulate team lead approval (this would change status from Submitted)
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({
          decision: 'Approved',
          notes: 'Approved for testing'
        });

      // Now try to update - should fail
      await request(app.getHttpServer())
        .put(`/api/requests/${newRequestId}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(updateData)
        .expect(400);
    });

    it('should return 404 for non-existent request', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
      const updateData = {
        justification: 'Updated justification for non-existent request'
      };

      await request(app.getHttpServer())
        .put(`/api/requests/${nonExistentId}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(updateData)
        .expect(404);
    });

    it('should require authentication', async () => {
      const updateData = {
        justification: 'Trying to update without authentication'
      };

      await request(app.getHttpServer())
        .put(`/api/requests/${testRequestId}`)
        .send(updateData)
        .expect(401);
    });

    it('should enforce ownership for Employee role', async () => {
      const updateData = {
        justification: 'Employee trying to update someone elses request'
      };

      // Employee should only update their own requests
      await request(app.getHttpServer())
        .put(`/api/requests/${testRequestId}`)
        .set('Authorization', 'Bearer other-employee-jwt-token')
        .send(updateData)
        .expect(403);
    });

    it('should allow TeamLead to update team member requests', async () => {
      const updateData = {
        justification: 'TeamLead updating team member request with additional context'
      };

      const response = await request(app.getHttpServer())
        .put(`/api/requests/${testRequestId}`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send(updateData)
        .expect(200);

      expect(response.body.justification).toBe(updateData.justification);
    });

    it('should allow Admin to update any request', async () => {
      const updateData = {
        justification: 'Admin updating request with administrative oversight and approval'
      };

      const response = await request(app.getHttpServer())
        .put(`/api/requests/${testRequestId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(updateData)
        .expect(200);

      expect(response.body.justification).toBe(updateData.justification);
    });

    it('should handle empty update gracefully', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/requests/${testRequestId}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .send({})
        .expect(200);

      expect(response.body.id).toBe(testRequestId);
      // Should return the request unchanged
    });

    it('should preserve other fields when updating', async () => {
      const originalResponse = await request(app.getHttpServer())
        .get(`/api/requests/${testRequestId}`)
        .set('Authorization', 'Bearer employee-jwt-token');

      const updateData = {
        justification: 'New justification while preserving other request fields'
      };

      const updateResponse = await request(app.getHttpServer())
        .put(`/api/requests/${testRequestId}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.justification).toBe(updateData.justification);
      expect(updateResponse.body.equipmentType).toBe(originalResponse.body.equipmentType);
      expect(updateResponse.body.status).toBe(originalResponse.body.status);
      expect(updateResponse.body.requesterId).toBe(originalResponse.body.requesterId);
      expect(updateResponse.body.teamLeadId).toBe(originalResponse.body.teamLeadId);
    });
  });
});