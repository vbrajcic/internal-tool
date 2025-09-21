import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

describe('Role-Based Access Control Integration Tests (T026)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let employeeUserId: string;
  let teamLeadUserId: string;
  let adminUserId: string;
  let otherTeamEmployeeId: string;
  let teamId: string;
  let otherTeamId: string;
  let equipmentId: string;

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

    // Set up complete organizational structure for RBAC testing

    // Create two teams
    const team1Data = {
      name: 'Development Team A',
      description: 'First team for RBAC testing'
    };

    const team1Response = await request(app.getHttpServer())
      .post('/api/teams')
      .set('Authorization', 'Bearer admin-jwt-token')
      .send(team1Data);

    teamId = team1Response.body.id;

    const team2Data = {
      name: 'Development Team B',
      description: 'Second team for RBAC testing'
    };

    const team2Response = await request(app.getHttpServer())
      .post('/api/teams')
      .set('Authorization', 'Bearer admin-jwt-token')
      .send(team2Data);

    otherTeamId = team2Response.body.id;

    // Create admin user
    const adminData = {
      email: 'admin.rbac@company.com',
      firstName: 'Admin',
      lastName: 'RBAC',
      role: 'Admin',
      teamId: teamId
    };

    const adminResponse = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', 'Bearer admin-jwt-token')
      .send(adminData);

    adminUserId = adminResponse.body.id;

    // Create team lead for Team A
    const teamLeadData = {
      email: 'teamlead.rbac@company.com',
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

    // Create employee in Team A
    const employeeData = {
      email: 'employee.rbac@company.com',
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

    // Create employee in Team B
    const otherEmployeeData = {
      email: 'employee.other@company.com',
      firstName: 'Jane',
      lastName: 'Other',
      role: 'Employee',
      teamId: otherTeamId
    };

    const otherEmployeeResponse = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', 'Bearer admin-jwt-token')
      .send(otherEmployeeData);

    otherTeamEmployeeId = otherEmployeeResponse.body.id;

    // Create test equipment
    const equipmentData = {
      serialNumber: 'RBAC-LAPTOP-001',
      brand: 'Apple',
      model: 'MacBook Pro',
      type: 'Laptop',
      status: 'Available',
      purchaseDate: '2024-01-15',
      classificationTag: 'Profico',
      condition: 'New'
    };

    const equipmentResponse = await request(app.getHttpServer())
      .post('/api/equipment')
      .set('Authorization', 'Bearer admin-jwt-token')
      .send(equipmentData);

    equipmentId = equipmentResponse.body.id;

    // Assign equipment to employee
    await request(app.getHttpServer())
      .post(`/api/equipment/${equipmentId}/transfer`)
      .set('Authorization', 'Bearer admin-jwt-token')
      .send({
        toUserId: employeeUserId,
        transferType: 'Assignment',
        reason: 'Initial assignment for RBAC testing'
      });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Scenario 5: Role-Based Access Control Validation', () => {
    it('should enforce Employee access restrictions correctly', async () => {
      // Step 1: Employee access restrictions

      // GET /api/equipment with employee credentials
      const equipmentResponse = await request(app.getHttpServer())
        .get('/api/equipment')
        .set('Authorization', 'Bearer employee-jwt-token')
        .expect(200);

      // Verify only own equipment visible
      expect(equipmentResponse.body).toHaveProperty('equipment');
      expect(Array.isArray(equipmentResponse.body.equipment)).toBe(true);

      equipmentResponse.body.equipment.forEach((equipment: any) => {
        expect(equipment.currentOwnerId).toBe(employeeUserId);
      });

      console.log(`✓ Employee sees only own equipment (${equipmentResponse.body.equipment.length} items)`);

      // Attempt admin operation - should get 403 error
      const adminAttempt = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send({
          email: 'unauthorized@company.com',
          firstName: 'Unauthorized',
          lastName: 'User',
          role: 'Employee',
          teamId: teamId
        })
        .expect(403);

      console.log('✓ Employee cannot perform admin operations (403 forbidden)');

      // Employee cannot access other users' equipment details
      const unauthorizedEquipment = await request(app.getHttpServer())
        .get('/api/equipment/unauthorized-id')
        .set('Authorization', 'Bearer employee-jwt-token')
        .expect(404); // Should not exist or not accessible

      // Employee cannot view other teams' data
      const teamDataAttempt = await request(app.getHttpServer())
        .get(`/api/teams/${otherTeamId}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .expect(403);

      console.log('✓ Employee cannot access other teams\' data');

      // Employee cannot approve requests
      const approvalAttempt = await request(app.getHttpServer())
        .post('/api/requests/some-id/team-lead-review')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send({ decision: 'Approved' })
        .expect(403);

      console.log('✓ Employee cannot perform approval operations');
    });

    it('should enforce TeamLead permissions correctly', async () => {
      // Step 2: Team lead permissions

      // GET /api/equipment with team lead credentials
      const equipmentResponse = await request(app.getHttpServer())
        .get('/api/equipment')
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .expect(200);

      // Verify team member equipment visible
      const teamMemberEquipment = equipmentResponse.body.equipment.filter(
        (eq: any) => eq.currentOwnerId === employeeUserId
      );

      expect(teamMemberEquipment.length).toBeGreaterThan(0);

      console.log(`✓ Team lead sees team member equipment (${teamMemberEquipment.length} items from team)`);

      // Create a request to test approval permissions
      const requestData = {
        equipmentType: 'Display',
        justification: 'Need display for RBAC testing workflow'
      };

      const requestResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(requestData);

      const requestId = requestResponse.body.id;

      // Verify team lead can approve own team requests only
      const teamLeadApproval = await request(app.getHttpServer())
        .post(`/api/requests/${requestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({
          decision: 'Approved',
          notes: 'Approved by team lead for testing'
        })
        .expect(200);

      expect(teamLeadApproval.body.teamLeadDecision).toBe('Approved');

      console.log('✓ Team lead can approve own team member requests');

      // Team lead cannot perform admin-only operations
      const adminOnlyAttempt = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({
          email: 'teamlead.unauthorized@company.com',
          firstName: 'Unauthorized',
          lastName: 'Creation',
          role: 'Employee',
          teamId: teamId
        })
        .expect(403);

      console.log('✓ Team lead cannot perform admin-only operations');

      // Team lead cannot approve requests from other teams
      const otherTeamRequestData = {
        equipmentType: 'Phone',
        justification: 'Request from other team member'
      };

      const otherTeamRequest = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer other-team-employee-jwt-token')
        .send(otherTeamRequestData);

      const crossTeamApproval = await request(app.getHttpServer())
        .post(`/api/requests/${otherTeamRequest.body.id}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' })
        .expect(403);

      console.log('✓ Team lead cannot approve other team requests');

      // Team lead cannot perform final admin review
      const adminReviewAttempt = await request(app.getHttpServer())
        .post(`/api/requests/${requestId}/admin-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' })
        .expect(403);

      console.log('✓ Team lead cannot perform admin review');
    });

    it('should allow Admin full access correctly', async () => {
      // Step 3: Admin full access

      // GET /api/equipment with admin credentials
      const equipmentResponse = await request(app.getHttpServer())
        .get('/api/equipment')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      // Verify all equipment visible
      expect(equipmentResponse.body.equipment.length).toBeGreaterThan(0);

      // Should see equipment from all teams/users
      const allOwners = new Set(
        equipmentResponse.body.equipment
          .filter((eq: any) => eq.currentOwnerId)
          .map((eq: any) => eq.currentOwnerId)
      );

      console.log(`✓ Admin sees all equipment (${equipmentResponse.body.equipment.length} items, ${allOwners.size} different owners)`);

      // Verify admin can perform all operations
      const adminOperations = [
        // Create user
        {
          endpoint: '/api/users',
          method: 'POST',
          data: {
            email: 'admin.created@company.com',
            firstName: 'Admin',
            lastName: 'Created',
            role: 'Employee',
            teamId: teamId
          }
        },
        // Create team
        {
          endpoint: '/api/teams',
          method: 'POST',
          data: {
            name: 'Admin Created Team',
            description: 'Team created by admin for testing'
          }
        },
        // Create equipment
        {
          endpoint: '/api/equipment',
          method: 'POST',
          data: {
            serialNumber: 'ADMIN-CREATED-001',
            brand: 'Dell',
            model: 'Latitude',
            type: 'Laptop',
            status: 'Available',
            purchaseDate: '2024-01-15',
            classificationTag: 'Profico',
            condition: 'New'
          }
        }
      ];

      for (const operation of adminOperations) {
        const response = await request(app.getHttpServer())
          [operation.method.toLowerCase() as 'post'](operation.endpoint)
          .set('Authorization', 'Bearer admin-jwt-token')
          .send(operation.data)
          .expect(201);

        expect(response.body).toHaveProperty('id');
      }

      console.log('✓ Admin can perform all create operations');

      // Admin can access any team's data
      const team1Data = await request(app.getHttpServer())
        .get(`/api/teams/${teamId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      const team2Data = await request(app.getHttpServer())
        .get(`/api/teams/${otherTeamId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(team1Data.body.id).toBe(teamId);
      expect(team2Data.body.id).toBe(otherTeamId);

      console.log('✓ Admin can access all team data');

      // Admin can perform final approvals
      const pendingRequests = await request(app.getHttpServer())
        .get('/api/requests?status=AdminReview')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      if (pendingRequests.body.requests.length > 0) {
        const requestId = pendingRequests.body.requests[0].id;

        const adminApproval = await request(app.getHttpServer())
          .post(`/api/requests/${requestId}/admin-review`)
          .set('Authorization', 'Bearer admin-jwt-token')
          .send({
            decision: 'Approved',
            notes: 'Admin final approval for testing'
          })
          .expect(200);

        expect(adminApproval.body.adminDecision).toBe('Approved');
      }

      console.log('✓ Admin can perform final approvals');
    });

    it('should handle user deactivation workflow correctly', async () => {
      // Step 4: User deactivation workflow

      // Create new user and equipment for deactivation testing
      const tempUserData = {
        email: 'temp.user@company.com',
        firstName: 'Temporary',
        lastName: 'User',
        role: 'Employee',
        teamId: teamId
      };

      const tempUserResponse = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(tempUserData);

      const tempUserId = tempUserResponse.body.id;

      // Create and assign equipment to temp user
      const tempEquipmentData = {
        serialNumber: 'TEMP-DEACTIVATION-001',
        brand: 'HP',
        model: 'EliteBook',
        type: 'Laptop',
        status: 'Available',
        purchaseDate: '2024-01-15',
        classificationTag: 'Profico',
        condition: 'New'
      };

      const tempEquipmentResponse = await request(app.getHttpServer())
        .post('/api/equipment')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(tempEquipmentData);

      const tempEquipmentId = tempEquipmentResponse.body.id;

      // Assign equipment to temp user
      await request(app.getHttpServer())
        .post(`/api/equipment/${tempEquipmentId}/transfer`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({
          toUserId: tempUserId,
          transferType: 'Assignment',
          reason: 'Assignment for deactivation testing'
        });

      // POST /api/users/{id}/deactivate with equipment transfer
      const deactivationData = {
        transferEquipmentTo: employeeUserId,
        reason: 'Employee leaving company - equipment transfer required'
      };

      const deactivationResponse = await request(app.getHttpServer())
        .post(`/api/users/${tempUserId}/deactivate`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(deactivationData)
        .expect(200);

      // Verify user marked inactive
      expect(deactivationResponse.body.isActive).toBe(false);

      console.log('✓ User marked inactive during deactivation');

      // Verify equipment transferred to other user
      const equipmentCheck = await request(app.getHttpServer())
        .get(`/api/equipment/${tempEquipmentId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(equipmentCheck.body.currentOwnerId).toBe(employeeUserId);
      expect(equipmentCheck.body.status).toBe('Assigned');

      console.log('✓ Equipment transferred to specified user');

      // Verify audit trail preserved
      const auditResponse = await request(app.getHttpServer())
        .get(`/api/audit/user/${tempUserId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(Array.isArray(auditResponse.body)).toBe(true);
      expect(auditResponse.body.length).toBeGreaterThan(0);

      // Should have deactivation audit entry
      const deactivationAudit = auditResponse.body.find(
        (log: any) => log.action === 'UPDATE' &&
        log.newValues && log.newValues.isActive === false
      );

      expect(deactivationAudit).toBeDefined();

      console.log('✓ Audit trail preserved during deactivation');

      // Verify transfer audit trail
      const transferAudit = await request(app.getHttpServer())
        .get(`/api/audit/equipment/${tempEquipmentId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      const deactivationTransfer = transferAudit.body.find(
        (log: any) => log.action === 'CREATE' && log.entityType === 'Transfer' &&
        log.newValues && log.newValues.reason && log.newValues.reason.includes('deactivation')
      );

      expect(deactivationTransfer).toBeDefined();

      console.log('✓ Equipment transfer audit trail created');
    });

    it('should enforce cross-team access restrictions', async () => {
      // Employees from different teams cannot access each other's data

      // Employee from Team A cannot see Team B member's equipment
      const crossTeamEquipment = await request(app.getHttpServer())
        .get('/api/equipment')
        .set('Authorization', 'Bearer employee-jwt-token')
        .expect(200);

      // Should not see equipment owned by other team member
      const otherTeamEquipmentFound = crossTeamEquipment.body.equipment.find(
        (eq: any) => eq.currentOwnerId === otherTeamEmployeeId
      );

      expect(otherTeamEquipmentFound).toBeUndefined();

      console.log('✓ Employee cannot see other team equipment');

      // Team lead cannot approve requests from other teams
      const otherTeamRequestData = {
        equipmentType: 'Tablet',
        justification: 'Cross-team request testing'
      };

      const otherTeamRequest = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer other-team-employee-jwt-token')
        .send(otherTeamRequestData);

      const crossTeamApproval = await request(app.getHttpServer())
        .post(`/api/requests/${otherTeamRequest.body.id}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' })
        .expect(403);

      console.log('✓ Team lead cannot approve cross-team requests');

      // Users cannot modify other users' profiles
      const profileModification = await request(app.getHttpServer())
        .put(`/api/users/${otherTeamEmployeeId}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .send({
          firstName: 'Modified',
          lastName: 'Unauthorized'
        })
        .expect(403);

      console.log('✓ Users cannot modify other users\' profiles');
    });

    it('should validate permission boundaries correctly', async () => {
      // Test edge cases and permission boundaries

      // Team lead cannot escalate their own role
      const roleEscalation = await request(app.getHttpServer())
        .put(`/api/users/${teamLeadUserId}`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ role: 'Admin' })
        .expect(403);

      console.log('✓ Team lead cannot escalate own role');

      // Employee cannot transfer equipment they don't own
      const unauthorizedTransfer = await request(app.getHttpServer())
        .post(`/api/equipment/${equipmentId}/transfer`)
        .set('Authorization', 'Bearer other-team-employee-jwt-token')
        .send({
          toUserId: otherTeamEmployeeId,
          transferType: 'Transfer',
          reason: 'Unauthorized transfer attempt'
        })
        .expect(403);

      console.log('✓ Employee cannot transfer equipment they don\'t own');

      // Team lead cannot access admin-only reports
      const adminReport = await request(app.getHttpServer())
        .get('/api/reports/audit-summary')
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .expect(403);

      console.log('✓ Team lead cannot access admin-only reports');

      // Employee cannot view subscription details they don't own
      const subscriptionData = {
        name: 'Unauthorized Access Test',
        price: 29.99,
        billingFrequency: 'Monthly',
        paymentMethod: 'CompanyCard',
        ownerId: adminUserId,
        ownerEmail: 'admin.rbac@company.com'
      };

      const subscriptionResponse = await request(app.getHttpServer())
        .post('/api/subscriptions')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(subscriptionData);

      const unauthorizedSubscriptionAccess = await request(app.getHttpServer())
        .get(`/api/subscriptions/${subscriptionResponse.body.id}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .expect(403);

      console.log('✓ Employee cannot view subscriptions they don\'t own');
    });

    it('should maintain security across all endpoints', async () => {
      // Comprehensive endpoint security validation

      const securityTests = [
        // Unauthorized user creation
        {
          method: 'post',
          endpoint: '/api/users',
          auth: 'employee-jwt-token',
          data: { email: 'test@test.com', firstName: 'Test', lastName: 'User', role: 'Employee', teamId: teamId },
          expectedStatus: 403
        },
        // Unauthorized team creation
        {
          method: 'post',
          endpoint: '/api/teams',
          auth: 'employee-jwt-token',
          data: { name: 'Unauthorized Team' },
          expectedStatus: 403
        },
        // Unauthorized equipment creation
        {
          method: 'post',
          endpoint: '/api/equipment',
          auth: 'employee-jwt-token',
          data: { serialNumber: 'UNAUTH-001', brand: 'Test', model: 'Test', type: 'Laptop', status: 'Available', purchaseDate: '2024-01-15', classificationTag: 'Profico', condition: 'New' },
          expectedStatus: 403
        },
        // Unauthorized subscription export
        {
          method: 'get',
          endpoint: '/api/subscriptions/export?format=csv',
          auth: 'employee-jwt-token',
          expectedStatus: 403
        }
      ];

      for (const test of securityTests) {
        const response = await request(app.getHttpServer())
          [test.method as 'post' | 'get'](test.endpoint)
          .set('Authorization', `Bearer ${test.auth}`)
          .send(test.data || {});

        expect(response.status).toBe(test.expectedStatus);
      }

      console.log('✓ All endpoints properly secured against unauthorized access');
    });
  });
});