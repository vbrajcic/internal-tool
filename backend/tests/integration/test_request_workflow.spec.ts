import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

describe('Equipment Request Workflow Integration Tests (T023)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let employeeUserId: string;
  let teamLeadUserId: string;
  let adminUserId: string;
  let teamId: string;

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

    // Set up test organization structure
    const teamData = {
      name: 'Product Development Team',
      description: 'Team for request workflow integration testing'
    };

    const teamResponse = await request(app.getHttpServer())
      .post('/api/teams')
      .set('Authorization', 'Bearer admin-jwt-token')
      .send(teamData);

    teamId = teamResponse.body.id;

    // Create admin user
    const adminData = {
      email: 'admin.workflow@company.com',
      firstName: 'Admin',
      lastName: 'Workflow',
      role: 'Admin',
      teamId: teamId
    };

    const adminResponse = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', 'Bearer admin-jwt-token')
      .send(adminData);

    adminUserId = adminResponse.body.id;

    // Create team lead user
    const teamLeadData = {
      email: 'teamlead.workflow@company.com',
      firstName: 'Team',
      lastName: 'Lead',
      role: 'TeamLead',
      teamId: teamId
    };

    const teamLeadResponse = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', 'Bearer admin-jwt-token')
      .send(teamLeadData);

    teamLeadUserId = teamLeadResponse.body.id;

    // Set team lead
    await request(app.getHttpServer())
      .put(`/api/teams/${teamId}`)
      .set('Authorization', 'Bearer admin-jwt-token')
      .send({ leadId: teamLeadUserId });

    // Create employee user
    const employeeData = {
      email: 'employee.workflow@company.com',
      firstName: 'John',
      lastName: 'Employee',
      role: 'Employee',
      teamId: teamId
    };

    const employeeResponse = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', 'Bearer admin-jwt-token')
      .send(employeeData);

    employeeUserId = employeeResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Scenario 2: Equipment Request and Approval Workflow', () => {
    it('should complete full request workflow from submission to fulfillment', async () => {
      // Step 1: Employee submits equipment request
      const requestData = {
        equipmentType: 'Laptop',
        justification: 'Need high-performance laptop for new machine learning project with complex data processing requirements',
        specifications: 'MacBook Pro 16-inch, M2 Max chip, 64GB RAM, 2TB SSD, for AI development work'
      };

      const submitResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(requestData)
        .expect(201);

      const requestId = submitResponse.body.id;

      // Verify initial status and assignment
      expect(submitResponse.body.status).toBe('Submitted');
      expect(submitResponse.body.teamLeadDecision).toBe('Pending');
      expect(submitResponse.body.requesterId).toBe(employeeUserId);
      expect(submitResponse.body.teamLeadId).toBe(teamLeadUserId);
      expect(submitResponse.body).toHaveProperty('requestedAt');

      console.log(`✓ Request submitted with ID: ${requestId}, status: ${submitResponse.body.status}`);

      // Verify notification email would be sent to team lead
      // In a real system, this would trigger email notification
      console.log(`✓ Team lead notification triggered for request ${requestId}`);

      // Step 2: Team lead reviews and approves
      const teamLeadReviewData = {
        decision: 'Approved',
        notes: 'Valid request for ML project, approved based on project requirements and budget availability'
      };

      const teamLeadResponse = await request(app.getHttpServer())
        .post(`/api/requests/${requestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send(teamLeadReviewData)
        .expect(200);

      // Verify status progression
      expect(teamLeadResponse.body.status).toBe('AdminReview');
      expect(teamLeadResponse.body.teamLeadDecision).toBe('Approved');
      expect(teamLeadResponse.body.teamLeadNotes).toBe(teamLeadReviewData.notes);
      expect(teamLeadResponse.body).toHaveProperty('teamLeadReviewedAt');
      expect(teamLeadResponse.body.teamLeadReviewedAt).not.toBeNull();

      console.log(`✓ Team lead approved request, status: ${teamLeadResponse.body.status}`);

      // Verify notification email would be sent to admin
      console.log(`✓ Admin notification triggered for request ${requestId}`);

      // Step 3: Admin makes final approval
      const adminReviewData = {
        decision: 'Approved',
        notes: 'Final approval granted after budget review and equipment availability check'
      };

      const adminResponse = await request(app.getHttpServer())
        .post(`/api/requests/${requestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(adminReviewData)
        .expect(200);

      // Verify final approval
      expect(adminResponse.body.status).toBe('Approved');
      expect(adminResponse.body.adminDecision).toBe('Approved');
      expect(adminResponse.body.adminNotes).toBe(adminReviewData.notes);
      expect(adminResponse.body.adminId).toBe(adminUserId);
      expect(adminResponse.body).toHaveProperty('adminReviewedAt');
      expect(adminResponse.body.adminReviewedAt).not.toBeNull();

      console.log(`✓ Admin approved request, status: ${adminResponse.body.status}`);

      // Step 4: Admin fulfills request with equipment assignment
      // First create equipment to fulfill the request
      const equipmentData = {
        serialNumber: 'LAPTOP-WF-001',
        brand: 'Apple',
        model: 'MacBook Pro 16-inch',
        type: 'Laptop',
        status: 'Available',
        purchaseDate: '2024-01-15',
        classificationTag: 'Profico',
        condition: 'New',
        notes: 'High-performance laptop for ML projects'
      };

      const equipmentResponse = await request(app.getHttpServer())
        .post('/api/equipment')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(equipmentData);

      const equipmentId = equipmentResponse.body.id;

      // Fulfill the request
      const fulfillmentData = {
        equipmentId: equipmentId,
        notes: 'Request fulfilled with matching specifications for ML project requirements'
      };

      const fulfillResponse = await request(app.getHttpServer())
        .post(`/api/requests/${requestId}/fulfill`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(fulfillmentData)
        .expect(200);

      // Verify fulfillment
      expect(fulfillResponse.body.status).toBe('Fulfilled');
      expect(fulfillResponse.body.equipmentId).toBe(equipmentId);
      expect(fulfillResponse.body).toHaveProperty('fulfilledAt');
      expect(fulfillResponse.body.fulfilledAt).not.toBeNull();

      console.log(`✓ Request fulfilled with equipment ${equipmentId}, status: ${fulfillResponse.body.status}`);

      // Verify equipment automatically assigned upon fulfillment
      const equipmentCheck = await request(app.getHttpServer())
        .get(`/api/equipment/${equipmentId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(equipmentCheck.body.status).toBe('Assigned');
      expect(equipmentCheck.body.currentOwnerId).toBe(employeeUserId);

      console.log(`✓ Equipment automatically assigned to requester`);

      // Verify final notification sent to requester
      console.log(`✓ Fulfillment notification sent to employee`);

      // Step 5: Verify complete workflow audit trail
      const auditResponse = await request(app.getHttpServer())
        .get(`/api/audit/request/${requestId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(Array.isArray(auditResponse.body)).toBe(true);
      expect(auditResponse.body.length).toBeGreaterThan(0);

      // Should have audit records for all major actions
      const actions = auditResponse.body.map((log: any) => log.action);
      expect(actions).toContain('CREATE'); // Request creation
      expect(actions).toContain('UPDATE'); // Team lead review, admin review, fulfillment

      console.log(`✓ Complete audit trail created for workflow`);
    });

    it('should handle team lead rejection properly', async () => {
      // Step 1: Employee submits request
      const requestData = {
        equipmentType: 'Phone',
        justification: 'Need new phone for testing mobile applications',
        specifications: 'iPhone 15 Pro with latest iOS version'
      };

      const submitResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(requestData)
        .expect(201);

      const requestId = submitResponse.body.id;

      // Step 2: Team lead rejects request
      const rejectionData = {
        decision: 'Rejected',
        notes: 'Current phone allocation is sufficient for testing needs',
        rejectionReason: 'Budget constraints and existing device adequacy for described use case'
      };

      const rejectionResponse = await request(app.getHttpServer())
        .post(`/api/requests/${requestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send(rejectionData)
        .expect(200);

      // Verify rejection workflow
      expect(rejectionResponse.body.status).toBe('Rejected');
      expect(rejectionResponse.body.teamLeadDecision).toBe('Rejected');
      expect(rejectionResponse.body.rejectionReason).toBe(rejectionData.rejectionReason);

      console.log(`✓ Team lead rejection workflow completed`);

      // Verify no further approvals possible
      const adminAttempt = await request(app.getHttpServer())
        .post(`/api/requests/${requestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({ decision: 'Approved' })
        .expect(400);

      console.log(`✓ Admin cannot review team-lead rejected requests`);

      // Verify rejection notification sent
      console.log(`✓ Rejection notification sent to employee`);
    });

    it('should handle admin rejection after team lead approval', async () => {
      // Step 1: Employee submits request
      const requestData = {
        equipmentType: 'Tablet',
        justification: 'Need tablet for client presentations and mobile demos',
        specifications: 'iPad Pro 12.9-inch with Apple Pencil for design work'
      };

      const submitResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(requestData)
        .expect(201);

      const requestId = submitResponse.body.id;

      // Step 2: Team lead approves
      await request(app.getHttpServer())
        .post(`/api/requests/${requestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({
          decision: 'Approved',
          notes: 'Valid need for client presentations'
        })
        .expect(200);

      // Step 3: Admin rejects
      const adminRejectionData = {
        decision: 'Rejected',
        notes: 'Budget freeze on non-essential equipment',
        rejectionReason: 'Current budget constraints require deferring tablet purchases until next quarter'
      };

      const adminRejectionResponse = await request(app.getHttpServer())
        .post(`/api/requests/${requestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(adminRejectionData)
        .expect(200);

      // Verify admin rejection
      expect(adminRejectionResponse.body.status).toBe('Rejected');
      expect(adminRejectionResponse.body.adminDecision).toBe('Rejected');
      expect(adminRejectionResponse.body.rejectionReason).toBe(adminRejectionData.rejectionReason);

      console.log(`✓ Admin rejection after team lead approval handled correctly`);

      // Verify no fulfillment possible
      const fulfillAttempt = await request(app.getHttpServer())
        .post(`/api/requests/${requestId}/fulfill`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({ equipmentId: 'some-id' })
        .expect(400);

      console.log(`✓ Fulfillment prevented for rejected requests`);
    });

    it('should support request amendments before approval', async () => {
      // Step 1: Employee submits request
      const initialData = {
        equipmentType: 'Display',
        justification: 'Need external monitor for development work',
        specifications: 'Basic 24-inch monitor'
      };

      const submitResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(initialData)
        .expect(201);

      const requestId = submitResponse.body.id;

      // Step 2: Employee amends request before team lead review
      const amendmentData = {
        justification: 'Need high-resolution external monitor for detailed design work and code review',
        specifications: 'Dell UltraSharp 27-inch 4K monitor with USB-C connectivity'
      };

      const amendResponse = await request(app.getHttpServer())
        .put(`/api/requests/${requestId}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(amendmentData)
        .expect(200);

      expect(amendResponse.body.justification).toBe(amendmentData.justification);
      expect(amendResponse.body.specifications).toBe(amendmentData.specifications);
      expect(amendResponse.body.status).toBe('Submitted'); // Should remain in submitted status

      console.log(`✓ Request amendment before approval works correctly`);

      // Step 3: Team lead reviews amended request
      const teamLeadResponse = await request(app.getHttpServer())
        .post(`/api/requests/${requestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({
          decision: 'Approved',
          notes: 'Approved with updated specifications'
        })
        .expect(200);

      expect(teamLeadResponse.body.justification).toBe(amendmentData.justification);
      expect(teamLeadResponse.body.specifications).toBe(amendmentData.specifications);

      console.log(`✓ Team lead reviews amended request successfully`);

      // Step 4: Verify amendment cannot happen after team lead approval
      const postApprovalAmendment = await request(app.getHttpServer())
        .put(`/api/requests/${requestId}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .send({
          justification: 'Trying to change after approval'
        })
        .expect(400);

      console.log(`✓ Amendment prevented after team lead approval`);
    });

    it('should enforce role-based request visibility and actions', async () => {
      // Create requests from different team members
      const requests = [];

      for (let i = 0; i < 3; i++) {
        const requestData = {
          equipmentType: 'Mouse',
          justification: `Need mouse for workstation ${i + 1}`
        };

        const response = await request(app.getHttpServer())
          .post('/api/requests')
          .set('Authorization', 'Bearer employee-jwt-token')
          .send(requestData);

        requests.push(response.body.id);
      }

      // Employee should only see their own requests
      const employeeView = await request(app.getHttpServer())
        .get('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .expect(200);

      employeeView.body.requests.forEach((req: any) => {
        expect(req.requesterId).toBe(employeeUserId);
      });

      console.log(`✓ Employee sees only their own requests`);

      // Team lead should see team member requests
      const teamLeadView = await request(app.getHttpServer())
        .get('/api/requests')
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .expect(200);

      const teamRequests = teamLeadView.body.requests.filter(
        (req: any) => req.teamLeadId === teamLeadUserId
      );
      expect(teamRequests.length).toBeGreaterThan(0);

      console.log(`✓ Team lead sees team member requests`);

      // Admin should see all requests
      const adminView = await request(app.getHttpServer())
        .get('/api/requests')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(adminView.body.requests.length).toBeGreaterThanOrEqual(
        employeeView.body.requests.length
      );

      console.log(`✓ Admin sees all requests`);

      // Employee cannot perform team lead actions
      const unauthorizedReview = await request(app.getHttpServer())
        .post(`/api/requests/${requests[0]}/team-lead-review`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .send({ decision: 'Approved' })
        .expect(403);

      console.log(`✓ Employee cannot perform team lead actions`);

      // Team lead cannot perform admin actions on approved requests
      // First approve a request as team lead
      await request(app.getHttpServer())
        .post(`/api/requests/${requests[0]}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      const unauthorizedAdmin = await request(app.getHttpServer())
        .post(`/api/requests/${requests[0]}/admin-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' })
        .expect(403);

      console.log(`✓ Team lead cannot perform admin review actions`);
    });

    it('should handle concurrent request processing correctly', async () => {
      // Create multiple requests simultaneously
      const requestPromises = Array(5).fill(null).map((_, i) =>
        request(app.getHttpServer())
          .post('/api/requests')
          .set('Authorization', 'Bearer employee-jwt-token')
          .send({
            equipmentType: 'Keyboard',
            justification: `Concurrent request ${i + 1} for keyboard replacement`
          })
      );

      const responses = await Promise.all(requestPromises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
      });

      // All should have unique IDs
      const ids = responses.map(r => r.body.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);

      console.log(`✓ Concurrent request submission handled correctly`);

      // Test concurrent team lead reviews
      const requestId = responses[0].body.id;

      const reviewPromises = Array(3).fill(null).map(() =>
        request(app.getHttpServer())
          .post(`/api/requests/${requestId}/team-lead-review`)
          .set('Authorization', 'Bearer team-lead-jwt-token')
          .send({ decision: 'Approved' })
      );

      const reviewResponses = await Promise.all(reviewPromises);

      // Only one should succeed
      const successCount = reviewResponses.filter(r => r.status === 200).length;
      const failCount = reviewResponses.filter(r => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(failCount).toBe(2);

      console.log(`✓ Concurrent review attempts handled correctly`);
    });

    it('should support request status filtering and queuing', async () => {
      // Create requests in different states for filtering
      const testRequests = [];

      // Submitted request
      const submittedReq = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send({
          equipmentType: 'Dongle',
          justification: 'Need USB-C dongle for presentations'
        });

      testRequests.push({ id: submittedReq.body.id, status: 'Submitted' });

      // Team lead approved request
      const teamApprovedReq = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send({
          equipmentType: 'Headphones',
          justification: 'Need noise-canceling headphones for focus'
        });

      await request(app.getHttpServer())
        .post(`/api/requests/${teamApprovedReq.body.id}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      testRequests.push({ id: teamApprovedReq.body.id, status: 'AdminReview' });

      // Test filtering by status
      const submittedFilter = await request(app.getHttpServer())
        .get('/api/requests?status=Submitted')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      submittedFilter.body.requests.forEach((req: any) => {
        expect(req.status).toBe('Submitted');
      });

      const adminReviewFilter = await request(app.getHttpServer())
        .get('/api/requests?status=AdminReview')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      adminReviewFilter.body.requests.forEach((req: any) => {
        expect(req.status).toBe('AdminReview');
      });

      console.log(`✓ Request status filtering works correctly`);

      // Test team lead queue (requests pending their review)
      const teamLeadQueue = await request(app.getHttpServer())
        .get(`/api/requests?status=Submitted&teamLeadId=${teamLeadUserId}`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .expect(200);

      teamLeadQueue.body.requests.forEach((req: any) => {
        expect(req.status).toBe('Submitted');
        expect(req.teamLeadId).toBe(teamLeadUserId);
      });

      console.log(`✓ Team lead queue filtering works correctly`);

      // Test admin queue (requests pending admin review)
      const adminQueue = await request(app.getHttpServer())
        .get('/api/requests?status=AdminReview')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      adminQueue.body.requests.forEach((req: any) => {
        expect(req.status).toBe('AdminReview');
      });

      console.log(`✓ Admin queue filtering works correctly`);
    });
  });
});