import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

describe('Requests Team Lead Review Contract Tests (T019)', () => {
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

    // Create a test request for team lead review
    const requestData = {
      equipmentType: 'Laptop',
      justification: 'Test request for team lead review workflow and approval testing'
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

  describe('POST /api/requests/{id}/team-lead-review', () => {
    it('should approve request with valid team lead credentials', async () => {
      const reviewData = {
        decision: 'Approved',
        notes: 'Request is justified and equipment is necessary for the project'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${testRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send(reviewData)
        .expect(200);

      expect(response.body.id).toBe(testRequestId);
      expect(response.body.status).toBe('AdminReview'); // Should move to next stage
      expect(response.body.teamLeadDecision).toBe('Approved');
      expect(response.body.teamLeadNotes).toBe(reviewData.notes);
      expect(response.body).toHaveProperty('teamLeadReviewedAt');
      expect(response.body.teamLeadReviewedAt).not.toBeNull();
    });

    it('should reject request with proper rejection reason', async () => {
      // Create a new request for rejection testing
      const newRequestData = {
        equipmentType: 'Display',
        justification: 'Test request for rejection workflow testing'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      const reviewData = {
        decision: 'Rejected',
        notes: 'Current equipment is sufficient for the described tasks',
        rejectionReason: 'Equipment not necessary based on current workload'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send(reviewData)
        .expect(200);

      expect(response.body.status).toBe('Rejected');
      expect(response.body.teamLeadDecision).toBe('Rejected');
      expect(response.body.teamLeadNotes).toBe(reviewData.notes);
      expect(response.body.rejectionReason).toBe(reviewData.rejectionReason);
      expect(response.body).toHaveProperty('teamLeadReviewedAt');
    });

    it('should approve request with minimal data (no notes)', async () => {
      // Create a new request for minimal approval testing
      const newRequestData = {
        equipmentType: 'Keyboard',
        justification: 'Test request for minimal approval data testing'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      const reviewData = {
        decision: 'Approved'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send(reviewData)
        .expect(200);

      expect(response.body.teamLeadDecision).toBe('Approved');
      expect(response.body.status).toBe('AdminReview');
      expect(response.body.teamLeadNotes).toBeNull();
    });

    it('should require decision field', async () => {
      // Create a new request for validation testing
      const newRequestData = {
        equipmentType: 'Mouse',
        justification: 'Test request for decision field validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      const incompleteData = {
        notes: 'Missing decision field'
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send(incompleteData)
        .expect(400);
    });

    it('should validate decision enum values', async () => {
      // Create a new request for enum validation testing
      const newRequestData = {
        equipmentType: 'Tablet',
        justification: 'Test request for decision enum validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      const invalidData = {
        decision: 'Maybe'
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send(invalidData)
        .expect(400);
    });

    it('should require rejectionReason when decision is Rejected', async () => {
      // Create a new request for rejection validation
      const newRequestData = {
        equipmentType: 'Dongle',
        justification: 'Test request for rejection reason validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      const incompleteRejection = {
        decision: 'Rejected',
        notes: 'Rejecting without reason'
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send(incompleteRejection)
        .expect(400);
    });

    it('should return 404 for non-existent request', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
      const reviewData = {
        decision: 'Approved'
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${nonExistentId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send(reviewData)
        .expect(404);
    });

    it('should require authentication', async () => {
      const reviewData = {
        decision: 'Approved'
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${testRequestId}/team-lead-review`)
        .send(reviewData)
        .expect(401);
    });

    it('should require TeamLead role or higher', async () => {
      // Create a new request for role validation
      const newRequestData = {
        equipmentType: 'Phone',
        justification: 'Test request for role validation testing'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      const reviewData = {
        decision: 'Approved'
      };

      // Employee should not be able to review
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(reviewData)
        .expect(403);
    });

    it('should enforce team-based access control for TeamLead', async () => {
      // Create a new request for team access validation
      const newRequestData = {
        equipmentType: 'Furniture',
        justification: 'Test request for team access control validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      const reviewData = {
        decision: 'Approved'
      };

      // TeamLead from different team should not be able to review
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer other-team-lead-jwt-token')
        .send(reviewData)
        .expect(403);
    });

    it('should allow Admin to review any request', async () => {
      // Create a new request for admin access testing
      const newRequestData = {
        equipmentType: 'Display',
        justification: 'Test request for admin access validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      const reviewData = {
        decision: 'Approved',
        notes: 'Admin approving cross-team request'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(reviewData)
        .expect(200);

      expect(response.body.teamLeadDecision).toBe('Approved');
      expect(response.body.status).toBe('AdminReview');
    });

    it('should prevent duplicate reviews', async () => {
      // Try to review the same request again
      const duplicateReview = {
        decision: 'Rejected',
        rejectionReason: 'Trying to override previous decision'
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${testRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send(duplicateReview)
        .expect(400); // Should prevent duplicate review
    });

    it('should prevent review of requests not in Submitted status', async () => {
      // Create and fulfill a request, then try to review it
      const newRequestData = {
        equipmentType: 'Laptop',
        justification: 'Test request for status validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // First approve it
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      // Then try to review again - should fail
      const secondReview = {
        decision: 'Rejected',
        rejectionReason: 'Trying to review already processed request'
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send(secondReview)
        .expect(400);
    });

    it('should record review timestamp', async () => {
      // Create a new request to test timestamp recording
      const newRequestData = {
        equipmentType: 'Mouse',
        justification: 'Test request for timestamp validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      const beforeReview = new Date();

      const reviewData = {
        decision: 'Approved'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send(reviewData)
        .expect(200);

      const afterReview = new Date();
      const reviewTimestamp = new Date(response.body.teamLeadReviewedAt);

      expect(reviewTimestamp).toBeInstanceOf(Date);
      expect(reviewTimestamp.getTime()).toBeGreaterThanOrEqual(beforeReview.getTime());
      expect(reviewTimestamp.getTime()).toBeLessThanOrEqual(afterReview.getTime());
    });
  });
});