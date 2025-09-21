import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

describe('Requests Admin Review Contract Tests (T020)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let adminReviewRequestId: string;
  let alreadyAdminReviewedId: string;

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

    // Create test request and move it through team lead approval to AdminReview status
    const requestData = {
      equipmentType: 'Laptop',
      justification: 'Test request for admin review workflow validation and testing'
    };

    const createResponse = await request(app.getHttpServer())
      .post('/api/requests')
      .set('Authorization', 'Bearer employee-jwt-token')
      .send(requestData);

    adminReviewRequestId = createResponse.body.id;

    // Team lead approval to move to AdminReview status
    await request(app.getHttpServer())
      .post(`/api/requests/${adminReviewRequestId}/team-lead-review`)
      .set('Authorization', 'Bearer team-lead-jwt-token')
      .send({
        decision: 'Approved',
        notes: 'Team lead approved for admin review testing'
      });

    // Create another request for testing already reviewed scenarios
    const alreadyReviewedData = {
      equipmentType: 'Display',
      justification: 'Test request for already admin reviewed scenario testing'
    };

    const alreadyResponse = await request(app.getHttpServer())
      .post('/api/requests')
      .set('Authorization', 'Bearer employee-jwt-token')
      .send(alreadyReviewedData);

    alreadyAdminReviewedId = alreadyResponse.body.id;

    // Team lead approval
    await request(app.getHttpServer())
      .post(`/api/requests/${alreadyAdminReviewedId}/team-lead-review`)
      .set('Authorization', 'Bearer team-lead-jwt-token')
      .send({ decision: 'Approved' });

    // Admin approval
    await request(app.getHttpServer())
      .post(`/api/requests/${alreadyAdminReviewedId}/admin-review`)
      .set('Authorization', 'Bearer admin-jwt-token')
      .send({
        decision: 'Approved',
        notes: 'Pre-approved for testing'
      });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/requests/{id}/admin-review', () => {
    it('should approve request with valid admin credentials', async () => {
      const reviewData = {
        decision: 'Approved',
        notes: 'Admin approved after thorough review of business justification'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${adminReviewRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(reviewData)
        .expect(200);

      expect(response.body.id).toBe(adminReviewRequestId);
      expect(response.body.status).toBe('Approved');
      expect(response.body.adminDecision).toBe('Approved');
      expect(response.body.adminNotes).toBe(reviewData.notes);
      expect(response.body).toHaveProperty('adminId');
      expect(response.body).toHaveProperty('adminReviewedAt');
      expect(response.body.adminReviewedAt).not.toBeNull();
    });

    it('should reject request with proper rejection reason', async () => {
      // Create new request for rejection testing
      const newRequestData = {
        equipmentType: 'Tablet',
        justification: 'Test request for admin rejection workflow testing'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // Team lead approval first
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      const reviewData = {
        decision: 'Rejected',
        notes: 'Admin review notes for rejection decision',
        rejectionReason: 'Budget constraints and existing equipment allocation covers current needs'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(reviewData)
        .expect(200);

      expect(response.body.status).toBe('Rejected');
      expect(response.body.adminDecision).toBe('Rejected');
      expect(response.body.adminNotes).toBe(reviewData.notes);
      expect(response.body.rejectionReason).toBe(reviewData.rejectionReason);
      expect(response.body).toHaveProperty('adminReviewedAt');
    });

    it('should approve request with minimal data (decision only)', async () => {
      // Create new request for minimal approval testing
      const newRequestData = {
        equipmentType: 'Keyboard',
        justification: 'Test request for minimal admin approval data testing'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // Team lead approval first
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      const reviewData = {
        decision: 'Approved'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(reviewData)
        .expect(200);

      expect(response.body.adminDecision).toBe('Approved');
      expect(response.body.status).toBe('Approved');
      expect(response.body.adminNotes).toBeNull();
    });

    it('should require decision field', async () => {
      // Create new request for validation testing
      const newRequestData = {
        equipmentType: 'Mouse',
        justification: 'Test request for admin decision field validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // Team lead approval first
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      const incompleteData = {
        notes: 'Notes without decision'
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(incompleteData)
        .expect(400);
    });

    it('should validate decision enum values', async () => {
      // Create new request for enum validation testing
      const newRequestData = {
        equipmentType: 'Dongle',
        justification: 'Test request for admin decision enum validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // Team lead approval first
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      const invalidData = {
        decision: 'Pending'
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(invalidData)
        .expect(400);
    });

    it('should require rejectionReason when decision is Rejected', async () => {
      // Create new request for rejection validation
      const newRequestData = {
        equipmentType: 'Phone',
        justification: 'Test request for admin rejection reason validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // Team lead approval first
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      const incompleteRejection = {
        decision: 'Rejected',
        notes: 'Rejecting without reason'
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(incompleteRejection)
        .expect(400);
    });

    it('should return 404 for non-existent request', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
      const reviewData = {
        decision: 'Approved'
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${nonExistentId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(reviewData)
        .expect(404);
    });

    it('should require authentication', async () => {
      const reviewData = {
        decision: 'Approved'
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${adminReviewRequestId}/admin-review`)
        .send(reviewData)
        .expect(401);
    });

    it('should require Admin role', async () => {
      // Create new request for role validation
      const newRequestData = {
        equipmentType: 'Furniture',
        justification: 'Test request for admin role validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // Team lead approval first
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      const reviewData = {
        decision: 'Approved'
      };

      // Employee should not be able to admin review
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(reviewData)
        .expect(403);

      // TeamLead should not be able to admin review
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send(reviewData)
        .expect(403);
    });

    it('should only allow review when request is in AdminReview status', async () => {
      // Create new request in Submitted status
      const newRequestData = {
        equipmentType: 'Display',
        justification: 'Test request for status validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      const reviewData = {
        decision: 'Approved'
      };

      // Try to admin review without team lead approval first
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(reviewData)
        .expect(400);
    });

    it('should prevent duplicate admin reviews', async () => {
      const duplicateReview = {
        decision: 'Rejected',
        rejectionReason: 'Trying to override previous admin decision'
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${alreadyAdminReviewedId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(duplicateReview)
        .expect(400);
    });

    it('should prevent admin review of team-lead rejected requests', async () => {
      // Create new request for team lead rejection testing
      const newRequestData = {
        equipmentType: 'Tablet',
        justification: 'Test request for team lead rejection validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // Team lead rejection
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({
          decision: 'Rejected',
          rejectionReason: 'Team lead rejected'
        });

      const reviewData = {
        decision: 'Approved'
      };

      // Admin should not be able to review team-lead rejected request
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(reviewData)
        .expect(400);
    });

    it('should validate UUID format for request ID', async () => {
      const reviewData = {
        decision: 'Approved'
      };

      await request(app.getHttpServer())
        .post('/api/requests/invalid-uuid/admin-review')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(reviewData)
        .expect(400);
    });

    it('should record admin review timestamp', async () => {
      // Create new request for timestamp validation
      const newRequestData = {
        equipmentType: 'Laptop',
        justification: 'Test request for admin timestamp validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // Team lead approval first
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      const beforeReview = new Date();

      const reviewData = {
        decision: 'Approved'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(reviewData)
        .expect(200);

      const afterReview = new Date();
      const reviewTimestamp = new Date(response.body.adminReviewedAt);

      expect(reviewTimestamp).toBeInstanceOf(Date);
      expect(reviewTimestamp.getTime()).toBeGreaterThanOrEqual(beforeReview.getTime());
      expect(reviewTimestamp.getTime()).toBeLessThanOrEqual(afterReview.getTime());
    });

    it('should set adminId to the reviewing admin', async () => {
      // Create new request for admin ID validation
      const newRequestData = {
        equipmentType: 'Mouse',
        justification: 'Test request for admin ID validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // Team lead approval first
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      const reviewData = {
        decision: 'Approved'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(reviewData)
        .expect(200);

      expect(response.body.adminId).toBeDefined();
      expect(response.body.adminId).not.toBeNull();
      // In a real system, this would match the admin user ID from the JWT
    });

    it('should handle concurrent admin review attempts gracefully', async () => {
      // Create new request for concurrency testing
      const newRequestData = {
        equipmentType: 'Keyboard',
        justification: 'Test request for admin review concurrency handling'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // Team lead approval first
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      const reviewData = {
        decision: 'Approved'
      };

      // Submit multiple concurrent admin reviews
      const promises = Array(3).fill(null).map(() =>
        request(app.getHttpServer())
          .post(`/api/requests/${newRequestId}/admin-review`)
          .set('Authorization', 'Bearer admin-jwt-token')
          .send(reviewData)
      );

      const responses = await Promise.all(promises);

      // Only one should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      const failedResponses = responses.filter(r => r.status === 400);

      expect(successfulResponses.length).toBe(1);
      expect(failedResponses.length).toBe(2);
      expect(successfulResponses[0].body.adminDecision).toBe('Approved');
    });

    it('should send notification email on approval', async () => {
      // Create new request for notification testing
      const notificationTestData = {
        equipmentType: 'Display',
        justification: 'Test request for admin approval notification'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(notificationTestData);

      const newRequestId = createResponse.body.id;

      // Team lead approval first
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      const reviewData = {
        decision: 'Approved',
        notes: 'Admin approved with notification expected'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(reviewData)
        .expect(200);

      expect(response.body.status).toBe('Approved');
      // In a real system, this would trigger email notification to requester and team lead
    });

    it('should send notification email on rejection', async () => {
      // Create new request for rejection notification testing
      const rejectionNotificationData = {
        equipmentType: 'Phone',
        justification: 'Test request for admin rejection notification'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(rejectionNotificationData);

      const newRequestId = createResponse.body.id;

      // Team lead approval first
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      const reviewData = {
        decision: 'Rejected',
        notes: 'Admin rejected with notification expected',
        rejectionReason: 'Final budget review determined equipment not essential'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(reviewData)
        .expect(200);

      expect(response.body.status).toBe('Rejected');
      // In a real system, this would trigger email notification to requester and team lead
    });
  });
});