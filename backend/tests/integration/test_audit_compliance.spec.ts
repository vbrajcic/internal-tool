import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

describe('Audit and Compliance Integration Tests (T027)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let adminUserId: string;
  let employeeUserId: string;
  let equipmentId: string;
  let subscriptionId: string;

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

    // Set up test data for comprehensive audit testing
    const teamData = {
      name: 'Audit Test Team',
      description: 'Team for audit and compliance testing'
    };

    const teamResponse = await request(app.getHttpServer())
      .post('/api/teams')
      .set('Authorization', 'Bearer admin-jwt-token')
      .send(teamData);

    const teamId = teamResponse.body.id;

    // Create admin user
    const adminData = {
      email: 'admin.audit@company.com',
      firstName: 'Admin',
      lastName: 'Audit',
      role: 'Admin',
      teamId: teamId
    };

    const adminResponse = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', 'Bearer admin-jwt-token')
      .send(adminData);

    adminUserId = adminResponse.body.id;

    // Create employee user
    const employeeData = {
      email: 'employee.audit@company.com',
      firstName: 'John',
      lastName: 'Audited',
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

  describe('Scenario 6: Audit and Compliance Reporting', () => {
    it('should maintain complete equipment audit trail verification', async () => {
      // Step 1: Equipment audit trail verification

      // Create equipment with full lifecycle for audit testing
      const equipmentData = {
        serialNumber: 'AUDIT-LAPTOP-001',
        brand: 'Apple',
        model: 'MacBook Pro 16-inch',
        type: 'Laptop',
        status: 'Available',
        purchaseDate: '2024-01-15',
        classificationTag: 'Profico',
        condition: 'New',
        notes: 'Brand new equipment for audit testing'
      };

      const equipmentResponse = await request(app.getHttpServer())
        .post('/api/equipment')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(equipmentData)
        .expect(201);

      equipmentId = equipmentResponse.body.id;

      console.log(`✓ Equipment created for audit testing: ${equipmentId}`);

      // Perform multiple operations to create audit trail
      const operations = [
        // Initial assignment
        {
          endpoint: `/api/equipment/${equipmentId}/transfer`,
          method: 'post',
          data: {
            toUserId: employeeUserId,
            transferType: 'Assignment',
            reason: 'Initial assignment for employee onboarding'
          }
        },
        // Condition update
        {
          endpoint: `/api/equipment/${equipmentId}`,
          method: 'put',
          data: {
            condition: 'Good',
            notes: 'Equipment in good condition after 3 months of use'
          }
        },
        // Transfer to another user (simulated)
        {
          endpoint: `/api/equipment/${equipmentId}/transfer`,
          method: 'post',
          data: {
            fromUserId: employeeUserId,
            toUserId: adminUserId,
            transferType: 'Transfer',
            reason: 'Employee role change, transferring to admin'
          }
        }
      ];

      for (const operation of operations) {
        await request(app.getHttpServer())
          [operation.method as 'post' | 'put'](operation.endpoint)
          .set('Authorization', 'Bearer admin-jwt-token')
          .send(operation.data);

        // Small delay to ensure distinct timestamps
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('✓ Multiple operations performed to create audit trail');

      // GET /api/equipment/{id} with transfer history
      const equipmentWithHistory = await request(app.getHttpServer())
        .get(`/api/equipment/${equipmentId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      // Verify complete ownership chain visible
      expect(equipmentWithHistory.body).toHaveProperty('transferHistory');
      expect(Array.isArray(equipmentWithHistory.body.transferHistory)).toBe(true);
      expect(equipmentWithHistory.body.transferHistory.length).toBeGreaterThanOrEqual(2);

      // Verify ownership chain chronological order
      const transfers = equipmentWithHistory.body.transferHistory.sort(
        (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      expect(transfers[0].transferType).toBe('Assignment');
      expect(transfers[0].toUserId).toBe(employeeUserId);
      expect(transfers[1].transferType).toBe('Transfer');
      expect(transfers[1].fromUserId).toBe(employeeUserId);
      expect(transfers[1].toUserId).toBe(adminUserId);

      console.log('✓ Complete ownership chain visible in chronological order');

      // Verify all changes logged with timestamps
      const auditResponse = await request(app.getHttpServer())
        .get(`/api/audit/equipment/${equipmentId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(Array.isArray(auditResponse.body)).toBe(true);
      expect(auditResponse.body.length).toBeGreaterThan(0);

      // Should have CREATE action for equipment creation
      const createAudit = auditResponse.body.find(
        (log: any) => log.action === 'CREATE' && log.entityType === 'Equipment'
      );
      expect(createAudit).toBeDefined();
      expect(createAudit).toHaveProperty('timestamp');
      expect(createAudit.userId).toBe(adminUserId);

      // Should have UPDATE action for condition change
      const updateAudit = auditResponse.body.find(
        (log: any) => log.action === 'UPDATE' && log.entityType === 'Equipment' &&
        log.newValues && log.newValues.condition === 'Good'
      );
      expect(updateAudit).toBeDefined();
      expect(updateAudit.oldValues.condition).toBe('New');
      expect(updateAudit.newValues.condition).toBe('Good');

      // Should have CREATE actions for transfers
      const transferAudits = auditResponse.body.filter(
        (log: any) => log.action === 'CREATE' && log.entityType === 'Transfer'
      );
      expect(transferAudits.length).toBeGreaterThanOrEqual(2);

      console.log('✓ All changes logged with detailed timestamps and user information');
    });

    it('should support annual inventory checkup verification', async () => {
      // Step 2: Annual inventory checkup

      // Trigger inventory verification process
      const inventoryStartResponse = await request(app.getHttpServer())
        .post('/api/inventory/verification/start')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({
          description: 'Annual inventory verification 2024',
          deadline: '2024-12-31'
        })
        .expect(201);

      const verificationId = inventoryStartResponse.body.id;

      console.log(`✓ Inventory verification process started: ${verificationId}`);

      // Verify users receive verification emails (simulated)
      const notificationResponse = await request(app.getHttpServer())
        .get(`/api/inventory/verification/${verificationId}/notifications`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(Array.isArray(notificationResponse.body)).toBe(true);
      expect(notificationResponse.body.length).toBeGreaterThan(0);

      // Should include notification for employee with assigned equipment
      const employeeNotification = notificationResponse.body.find(
        (notif: any) => notif.userId === employeeUserId
      );
      expect(employeeNotification).toBeDefined();

      console.log('✓ Verification emails sent to users with assigned equipment');

      // Simulate user verification responses
      const verificationResponse = await request(app.getHttpServer())
        .post(`/api/inventory/verification/${verificationId}/response`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .send({
          equipmentVerifications: [
            {
              equipmentId: equipmentId,
              status: 'Verified',
              condition: 'Good',
              location: 'Home office',
              notes: 'Equipment verified and in good working condition'
            }
          ]
        })
        .expect(201);

      console.log('✓ User verification response recorded');

      // Verify equipment status updates tracked
      const equipmentAfterVerification = await request(app.getHttpServer())
        .get(`/api/equipment/${equipmentId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(equipmentAfterVerification.body).toHaveProperty('lastVerified');
      expect(equipmentAfterVerification.body.lastVerified).not.toBeNull();

      // Check verification audit trail
      const verificationAudit = await request(app.getHttpServer())
        .get(`/api/audit/equipment/${equipmentId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      const verificationLog = verificationAudit.body.find(
        (log: any) => log.action === 'UPDATE' && log.entityType === 'Equipment' &&
        log.newValues && log.newValues.lastVerified
      );

      expect(verificationLog).toBeDefined();

      console.log('✓ Equipment verification status updates properly tracked');
    });

    it('should generate comprehensive compliance reports', async () => {
      // Step 3: Compliance report generation

      // Create subscription data for compliance testing
      const subscriptionData = {
        name: 'Adobe Creative Cloud Compliance',
        price: 79.99,
        billingFrequency: 'Monthly',
        paymentMethod: 'CompanyCard',
        ownerId: employeeUserId,
        ownerEmail: 'employee.audit@company.com',
        renewalDate: '2024-12-31'
      };

      const subscriptionResponse = await request(app.getHttpServer())
        .post('/api/subscriptions')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(subscriptionData);

      subscriptionId = subscriptionResponse.body.id;

      // Upload invoice for compliance tracking
      const invoiceBuffer = Buffer.from('%PDF-1.4\nCompliance test invoice content');

      await request(app.getHttpServer())
        .post(`/api/subscriptions/${subscriptionId}/invoices`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .attach('file', invoiceBuffer, 'compliance_invoice.pdf')
        .field('amount', '79.99')
        .field('invoiceDate', '2024-01-15')
        .field('description', 'Monthly subscription invoice for compliance');

      console.log('✓ Subscription and invoice data created for compliance testing');

      // GET /api/reports/audit?type=equipment
      const equipmentAuditReport = await request(app.getHttpServer())
        .get('/api/reports/audit?type=equipment')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      // Verify comprehensive audit data exported
      expect(equipmentAuditReport.body).toHaveProperty('reportId');
      expect(equipmentAuditReport.body).toHaveProperty('generatedAt');
      expect(equipmentAuditReport.body).toHaveProperty('reportType', 'equipment');
      expect(equipmentAuditReport.body).toHaveProperty('data');

      const auditData = equipmentAuditReport.body.data;
      expect(auditData).toHaveProperty('totalEquipment');
      expect(auditData).toHaveProperty('equipmentByStatus');
      expect(auditData).toHaveProperty('transferHistory');
      expect(auditData).toHaveProperty('conditionSummary');

      console.log('✓ Equipment audit report includes comprehensive data');

      // Generate subscription compliance report
      const subscriptionAuditReport = await request(app.getHttpServer())
        .get('/api/reports/audit?type=subscription')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(subscriptionAuditReport.body.data).toHaveProperty('totalSubscriptions');
      expect(subscriptionAuditReport.body.data).toHaveProperty('totalMonthlySpend');
      expect(subscriptionAuditReport.body.data).toHaveProperty('invoiceCompliance');
      expect(subscriptionAuditReport.body.data).toHaveProperty('renewalCalendar');

      console.log('✓ Subscription audit report includes financial compliance data');

      // Generate comprehensive compliance report
      const fullComplianceReport = await request(app.getHttpServer())
        .get('/api/reports/compliance?startDate=2024-01-01&endDate=2024-12-31')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      // Verify report suitable for external audits
      expect(fullComplianceReport.body).toHaveProperty('executive_summary');
      expect(fullComplianceReport.body).toHaveProperty('asset_inventory');
      expect(fullComplianceReport.body).toHaveProperty('financial_summary');
      expect(fullComplianceReport.body).toHaveProperty('access_controls');
      expect(fullComplianceReport.body).toHaveProperty('data_retention');
      expect(fullComplianceReport.body).toHaveProperty('audit_trail_integrity');

      const assetInventory = fullComplianceReport.body.asset_inventory;
      expect(assetInventory).toHaveProperty('total_assets');
      expect(assetInventory).toHaveProperty('asset_utilization');
      expect(assetInventory).toHaveProperty('compliance_percentage');

      const financialSummary = fullComplianceReport.body.financial_summary;
      expect(financialSummary).toHaveProperty('total_subscription_spend');
      expect(financialSummary).toHaveProperty('invoice_coverage');
      expect(financialSummary).toHaveProperty('payment_method_breakdown');

      console.log('✓ Comprehensive compliance report suitable for external audits');
    });

    it('should validate audit trail integrity and immutability', async () => {
      // Verify audit log immutability and integrity

      // Get initial audit count
      const initialAuditResponse = await request(app.getHttpServer())
        .get('/api/audit/summary')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      const initialCount = initialAuditResponse.body.totalRecords;

      // Perform operation that should create audit trail
      await request(app.getHttpServer())
        .put(`/api/equipment/${equipmentId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({
          notes: 'Audit integrity test - updated notes'
        });

      // Verify new audit record created
      const updatedAuditResponse = await request(app.getHttpServer())
        .get('/api/audit/summary')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(updatedAuditResponse.body.totalRecords).toBe(initialCount + 1);

      console.log('✓ New audit records created for all operations');

      // Test audit log tamper protection
      const specificAuditResponse = await request(app.getHttpServer())
        .get(`/api/audit/equipment/${equipmentId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      const auditRecord = specificAuditResponse.body[0];

      // Attempt to modify audit record (should fail)
      const tamperAttempt = await request(app.getHttpServer())
        .put(`/api/audit/${auditRecord.id}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({
          action: 'MODIFIED',
          userId: 'fake-user-id'
        })
        .expect(403); // Should be forbidden

      console.log('✓ Audit records are immutable and tamper-protected');

      // Verify audit log retention policy
      const retentionPolicyResponse = await request(app.getHttpServer())
        .get('/api/audit/retention-policy')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(retentionPolicyResponse.body).toHaveProperty('retentionYears', 7);
      expect(retentionPolicyResponse.body).toHaveProperty('oldestRecord');
      expect(retentionPolicyResponse.body).toHaveProperty('newestRecord');

      console.log('✓ 7-year retention policy properly configured and enforced');
    });

    it('should support detailed user activity auditing', async () => {
      // Generate comprehensive user activity audit

      // Get user activity report
      const userActivityResponse = await request(app.getHttpServer())
        .get(`/api/audit/user/${employeeUserId}/activity?startDate=2024-01-01&endDate=2024-12-31`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(userActivityResponse.body).toHaveProperty('userId', employeeUserId);
      expect(userActivityResponse.body).toHaveProperty('activities');
      expect(Array.isArray(userActivityResponse.body.activities)).toBe(true);

      const activities = userActivityResponse.body.activities;

      // Should include various activity types
      const activityTypes = new Set(activities.map((a: any) => a.action));
      expect(activityTypes.size).toBeGreaterThan(0);

      // Should include login activities (simulated)
      expect(userActivityResponse.body).toHaveProperty('loginSummary');
      expect(userActivityResponse.body.loginSummary).toHaveProperty('totalLogins');
      expect(userActivityResponse.body.loginSummary).toHaveProperty('lastLogin');

      console.log('✓ Detailed user activity audit available');

      // Generate team activity summary
      const teamActivityResponse = await request(app.getHttpServer())
        .get('/api/audit/team-activity-summary')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(Array.isArray(teamActivityResponse.body)).toBe(true);
      teamActivityResponse.body.forEach((teamSummary: any) => {
        expect(teamSummary).toHaveProperty('teamId');
        expect(teamSummary).toHaveProperty('teamName');
        expect(teamSummary).toHaveProperty('memberCount');
        expect(teamSummary).toHaveProperty('equipmentCount');
        expect(teamSummary).toHaveProperty('requestCount');
        expect(teamSummary).toHaveProperty('recentActivity');
      });

      console.log('✓ Team activity summary provides organizational oversight');
    });

    it('should generate regulatory compliance exports', async () => {
      // Generate exports suitable for regulatory compliance

      // SOX compliance export
      const soxExportResponse = await request(app.getHttpServer())
        .get('/api/compliance/export/sox?year=2024')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(soxExportResponse.headers['content-type']).toContain('application/octet-stream');
      expect(soxExportResponse.headers['content-disposition']).toContain('SOX_Compliance_2024');

      console.log('✓ SOX compliance export generated');

      // GDPR data export
      const gdprExportResponse = await request(app.getHttpServer())
        .get('/api/compliance/export/gdpr')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(gdprExportResponse.headers['content-disposition']).toContain('GDPR_Data_Export');

      console.log('✓ GDPR compliance export generated');

      // ISO 27001 asset inventory
      const isoExportResponse = await request(app.getHttpServer())
        .get('/api/compliance/export/iso27001')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(isoExportResponse.headers['content-disposition']).toContain('ISO27001_Asset_Inventory');

      console.log('✓ ISO 27001 compliance export generated');

      // Financial audit export
      const financialExportResponse = await request(app.getHttpServer())
        .get('/api/compliance/export/financial?startDate=2024-01-01&endDate=2024-12-31')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      const exportContent = financialExportResponse.body.toString();
      expect(exportContent).toContain('subscription');
      expect(exportContent).toContain('invoice');
      expect(exportContent).toContain('amount');

      console.log('✓ Financial audit export includes all monetary transactions');
    });

    it('should provide real-time audit monitoring capabilities', async () => {
      // Test real-time audit monitoring and alerting

      // Get current audit metrics
      const metricsResponse = await request(app.getHttpServer())
        .get('/api/audit/metrics/realtime')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(metricsResponse.body).toHaveProperty('current_active_users');
      expect(metricsResponse.body).toHaveProperty('recent_equipment_changes');
      expect(metricsResponse.body).toHaveProperty('pending_approvals');
      expect(metricsResponse.body).toHaveProperty('security_events');

      console.log('✓ Real-time audit metrics available');

      // Test audit alert configuration
      const alertConfigResponse = await request(app.getHttpServer())
        .get('/api/audit/alerts/config')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(Array.isArray(alertConfigResponse.body)).toBe(true);
      alertConfigResponse.body.forEach((alert: any) => {
        expect(alert).toHaveProperty('alertType');
        expect(alert).toHaveProperty('enabled');
        expect(alert).toHaveProperty('threshold');
        expect(alert).toHaveProperty('recipients');
      });

      console.log('✓ Audit alert configuration accessible');

      // Simulate high-risk activity for alerting
      const highRiskActivityResponse = await request(app.getHttpServer())
        .post('/api/audit/simulate/high-risk-activity')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({
          activityType: 'multiple_failed_access_attempts',
          userId: employeeUserId,
          details: 'Simulated for testing audit alerts'
        })
        .expect(201);

      expect(highRiskActivityResponse.body).toHaveProperty('alertTriggered', true);
      expect(highRiskActivityResponse.body).toHaveProperty('alertId');

      console.log('✓ Real-time security alerting functional');
    });

    it('should maintain cross-system audit consistency', async () => {
      // Verify audit consistency across different system components

      // Perform operation that affects multiple entities
      const requestData = {
        equipmentType: 'Display',
        justification: 'Cross-system audit consistency testing'
      };

      const requestResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(requestData);

      const requestId = requestResponse.body.id;

      // Approve through workflow
      await request(app.getHttpServer())
        .post(`/api/requests/${requestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      await request(app.getHttpServer())
        .post(`/api/requests/${requestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({ decision: 'Approved' });

      // Check audit consistency across entities
      const requestAudit = await request(app.getHttpServer())
        .get(`/api/audit/request/${requestId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      const userAudit = await request(app.getHttpServer())
        .get(`/api/audit/user/${employeeUserId}/activity`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      // Verify consistent timestamps and user references
      const requestCreationAudit = requestAudit.body.find(
        (log: any) => log.action === 'CREATE' && log.entityType === 'Request'
      );

      const userRequestActivity = userAudit.body.activities.find(
        (activity: any) => activity.entityId === requestId && activity.action === 'CREATE'
      );

      expect(requestCreationAudit).toBeDefined();
      expect(userRequestActivity).toBeDefined();
      expect(requestCreationAudit.userId).toBe(userRequestActivity.userId);

      console.log('✓ Cross-system audit consistency maintained');
    });
  });
});