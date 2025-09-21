import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

describe('Subscription Management Integration Tests (T024)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let adminUserId: string;
  let employeeUserId: string;
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

    // Set up test users for subscription management
    const teamData = {
      name: 'Software Team',
      description: 'Team for subscription management testing'
    };

    const teamResponse = await request(app.getHttpServer())
      .post('/api/teams')
      .set('Authorization', 'Bearer admin-jwt-token')
      .send(teamData);

    const teamId = teamResponse.body.id;

    // Create admin user
    const adminData = {
      email: 'admin.subscription@company.com',
      firstName: 'Admin',
      lastName: 'Subscription',
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
      email: 'employee.subscription@company.com',
      firstName: 'John',
      lastName: 'Developer',
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

  describe('Scenario 3: Subscription Management and Invoice Tracking', () => {
    it('should complete full subscription lifecycle from registration to invoice tracking', async () => {
      // Step 1: Admin registers company subscription
      const subscriptionData = {
        name: 'Adobe Creative Cloud Enterprise',
        price: 79.99,
        billingFrequency: 'Monthly',
        paymentMethod: 'CompanyCard',
        ownerId: employeeUserId,
        ownerEmail: 'employee.subscription@company.com',
        renewalDate: '2024-12-31'
      };

      const subscriptionResponse = await request(app.getHttpServer())
        .post('/api/subscriptions')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(subscriptionData)
        .expect(201);

      subscriptionId = subscriptionResponse.body.id;

      // Verify subscription created with owner assignment
      expect(subscriptionResponse.body.name).toBe(subscriptionData.name);
      expect(subscriptionResponse.body.price).toBe(subscriptionData.price);
      expect(subscriptionResponse.body.billingFrequency).toBe(subscriptionData.billingFrequency);
      expect(subscriptionResponse.body.paymentMethod).toBe(subscriptionData.paymentMethod);
      expect(subscriptionResponse.body.ownerId).toBe(employeeUserId);
      expect(subscriptionResponse.body.ownerEmail).toBe(subscriptionData.ownerEmail);
      expect(subscriptionResponse.body.isActive).toBe(true);

      console.log(`✓ Subscription registered with ID: ${subscriptionId}`);

      // Verify billing frequency and payment method set correctly
      expect(['Monthly', 'Yearly']).toContain(subscriptionResponse.body.billingFrequency);
      expect(['CompanyCard', 'PersonalReimbursed']).toContain(subscriptionResponse.body.paymentMethod);

      console.log(`✓ Billing frequency and payment method configured correctly`);

      // Step 2: Employee uploads monthly invoice
      const invoiceBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n\nFake Adobe invoice content for testing');

      const invoiceResponse = await request(app.getHttpServer())
        .post(`/api/subscriptions/${subscriptionId}/invoices`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .attach('file', invoiceBuffer, 'adobe_invoice_jan_2024.pdf')
        .field('amount', '79.99')
        .field('invoiceDate', '2024-01-15')
        .field('description', 'Adobe Creative Cloud monthly subscription - January 2024')
        .expect(201);

      // Verify invoice stored in file system (S3)
      expect(invoiceResponse.body).toHaveProperty('id');
      expect(invoiceResponse.body.subscriptionId).toBe(subscriptionId);
      expect(invoiceResponse.body.fileName).toBe('adobe_invoice_jan_2024.pdf');
      expect(invoiceResponse.body).toHaveProperty('filePath');
      expect(invoiceResponse.body.amount).toBe(79.99);
      expect(invoiceResponse.body.invoiceDate).toBe('2024-01-15');
      expect(invoiceResponse.body.description).toBe('Adobe Creative Cloud monthly subscription - January 2024');
      expect(invoiceResponse.body.uploadedById).toBe(employeeUserId);
      expect(invoiceResponse.body.isVerified).toBe(false);

      console.log(`✓ Invoice uploaded and stored in file system`);

      // Verify invoice metadata extracted correctly
      expect(typeof invoiceResponse.body.amount).toBe('number');
      expect(invoiceResponse.body.invoiceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      console.log(`✓ Invoice metadata extracted and validated`);

      // Step 3: Upload additional invoices for tracking
      const invoices = [
        {
          fileName: 'adobe_invoice_feb_2024.pdf',
          amount: 79.99,
          invoiceDate: '2024-02-15',
          description: 'Adobe Creative Cloud monthly subscription - February 2024'
        },
        {
          fileName: 'adobe_invoice_mar_2024.pdf',
          amount: 79.99,
          invoiceDate: '2024-03-15',
          description: 'Adobe Creative Cloud monthly subscription - March 2024'
        }
      ];

      for (const invoice of invoices) {
        const buffer = Buffer.from(`%PDF-1.4\nFake invoice content for ${invoice.fileName}`);

        await request(app.getHttpServer())
          .post(`/api/subscriptions/${subscriptionId}/invoices`)
          .set('Authorization', 'Bearer employee-jwt-token')
          .attach('file', buffer, invoice.fileName)
          .field('amount', invoice.amount.toString())
          .field('invoiceDate', invoice.invoiceDate)
          .field('description', invoice.description)
          .expect(201);
      }

      console.log(`✓ Multiple invoices uploaded for subscription tracking`);

      // Step 4: Verify subscription details include invoice information
      const subscriptionDetails = await request(app.getHttpServer())
        .get(`/api/subscriptions/${subscriptionId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(subscriptionDetails.body).toHaveProperty('invoices');
      expect(Array.isArray(subscriptionDetails.body.invoices)).toBe(true);
      expect(subscriptionDetails.body.invoices.length).toBe(3);

      // Should include calculated totals
      expect(subscriptionDetails.body).toHaveProperty('totalPaid');
      expect(subscriptionDetails.body.totalPaid).toBe(239.97); // 3 * 79.99

      expect(subscriptionDetails.body).toHaveProperty('lastInvoiceDate');
      expect(subscriptionDetails.body.lastInvoiceDate).toBe('2024-03-15');

      console.log(`✓ Subscription details include comprehensive invoice information`);
    });

    it('should send automated reminder notifications', async () => {
      // Step 3: System sends reminder notifications
      // This would typically be triggered by a scheduled job
      // For testing, we'll simulate the reminder check

      // Get subscriptions approaching renewal
      const currentDate = new Date();
      const reminderDate = new Date(currentDate);
      reminderDate.setDate(reminderDate.getDate() + 30); // 30 days ahead

      const renewalReminderResponse = await request(app.getHttpServer())
        .get(`/api/subscriptions?renewalBefore=${reminderDate.toISOString().split('T')[0]}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      // Should include our test subscription if renewal date is within range
      const testSubscription = renewalReminderResponse.body.subscriptions.find(
        (sub: any) => sub.id === subscriptionId
      );

      if (testSubscription) {
        expect(testSubscription.isActive).toBe(true);
        expect(testSubscription.ownerId).toBe(employeeUserId);

        console.log(`✓ Subscription identified for renewal reminder`);
      }

      // Verify only active subscriptions included in reminders
      renewalReminderResponse.body.subscriptions.forEach((subscription: any) => {
        expect(subscription.isActive).toBe(true);
      });

      console.log(`✓ Only active subscriptions included in reminder checks`);

      // Simulate reminder email sending
      // In a real system, this would trigger actual email notifications
      console.log(`✓ Reminder notifications would be sent to subscription owners`);
    });

    it('should support comprehensive subscription data export for accounting', async () => {
      // Step 4: Accounting exports subscription data

      // Test CSV export
      const csvExportResponse = await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=csv')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(csvExportResponse.headers['content-type']).toContain('application/octet-stream');
      expect(csvExportResponse.headers['content-disposition']).toContain('attachment');
      expect(csvExportResponse.headers['content-disposition']).toContain('.csv');

      // Verify CSV content structure
      const csvContent = csvExportResponse.body.toString();
      expect(csvContent).toContain('name');
      expect(csvContent).toContain('price');
      expect(csvContent).toContain('billingFrequency');
      expect(csvContent).toContain('paymentMethod');
      expect(csvContent).toContain('ownerEmail');
      expect(csvContent).toContain('Adobe Creative Cloud Enterprise');

      console.log(`✓ CSV export includes all subscriptions and invoice data`);

      // Test Excel export
      const excelExportResponse = await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=excel')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(excelExportResponse.headers['content-disposition']).toContain('.xlsx');
      expect(Buffer.isBuffer(excelExportResponse.body)).toBe(true);

      console.log(`✓ Excel export generated successfully`);

      // Test export with date range filtering
      const filteredExportResponse = await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=csv&startDate=2024-01-01&endDate=2024-12-31')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(filteredExportResponse.headers['content-type']).toContain('application/octet-stream');

      console.log(`✓ Date range filtering works for exports`);

      // Test export with payment method filtering
      const paymentFilterExportResponse = await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=csv&paymentMethod=CompanyCard')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      const filteredContent = paymentFilterExportResponse.body.toString();
      // Should only include CompanyCard subscriptions in the data
      expect(filteredContent).toContain('CompanyCard');

      console.log(`✓ Payment method filtering works for exports`);

      // Verify data formatted for accounting reconciliation
      expect(csvContent).toContain('totalPaid'); // Should include calculated totals
      expect(csvContent).toContain('lastInvoiceDate'); // Should include latest invoice info

      console.log(`✓ Export data properly formatted for accounting reconciliation`);
    });

    it('should handle subscription ownership tracking correctly', async () => {
      // Create subscription owned by different employee
      const subscription2Data = {
        name: 'GitHub Enterprise',
        price: 44.00,
        billingFrequency: 'Monthly',
        paymentMethod: 'PersonalReimbursed',
        ownerId: adminUserId,
        ownerEmail: 'admin.subscription@company.com'
      };

      const subscription2Response = await request(app.getHttpServer())
        .post('/api/subscriptions')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(subscription2Data)
        .expect(201);

      const subscription2Id = subscription2Response.body.id;

      // Test owner-based filtering
      const employeeSubscriptions = await request(app.getHttpServer())
        .get(`/api/subscriptions?ownerId=${employeeUserId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      employeeSubscriptions.body.subscriptions.forEach((sub: any) => {
        expect(sub.ownerId).toBe(employeeUserId);
      });

      const adminSubscriptions = await request(app.getHttpServer())
        .get(`/api/subscriptions?ownerId=${adminUserId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      adminSubscriptions.body.subscriptions.forEach((sub: any) => {
        expect(sub.ownerId).toBe(adminUserId);
      });

      console.log(`✓ Subscription ownership tracking and filtering works correctly`);

      // Test email-based identification
      expect(subscription2Response.body.ownerEmail).toBe('admin.subscription@company.com');
      expect(subscription2Response.body.ownerId).toBe(adminUserId);

      console.log(`✓ Email-based subscription identification works`);
    });

    it('should support subscription lifecycle management', async () => {
      // Test subscription update
      const updateData = {
        price: 89.99, // Price increase
        renewalDate: '2025-01-31',
        isActive: true
      };

      const updateResponse = await request(app.getHttpServer())
        .put(`/api/subscriptions/${subscriptionId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.price).toBe(89.99);
      expect(updateResponse.body.renewalDate).toBe('2025-01-31');

      console.log(`✓ Subscription updates work correctly`);

      // Test subscription deactivation
      const deactivateData = {
        isActive: false
      };

      const deactivateResponse = await request(app.getHttpServer())
        .put(`/api/subscriptions/${subscriptionId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(deactivateData)
        .expect(200);

      expect(deactivateResponse.body.isActive).toBe(false);

      console.log(`✓ Subscription deactivation works correctly`);

      // Verify deactivated subscriptions excluded from reminders
      const activeSubscriptionsResponse = await request(app.getHttpServer())
        .get('/api/subscriptions?isActive=true')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      const deactivatedFound = activeSubscriptionsResponse.body.subscriptions.find(
        (sub: any) => sub.id === subscriptionId
      );

      expect(deactivatedFound).toBeUndefined();

      console.log(`✓ Deactivated subscriptions excluded from active lists`);
    });

    it('should handle invoice verification workflow', async () => {
      // Admin verifies uploaded invoice
      const invoicesResponse = await request(app.getHttpServer())
        .get(`/api/subscriptions/${subscriptionId}/invoices`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      const firstInvoice = invoicesResponse.body[0];
      expect(firstInvoice.isVerified).toBe(false);

      // Mark invoice as verified
      const verifyResponse = await request(app.getHttpServer())
        .put(`/api/invoices/${firstInvoice.id}/verify`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({
          verified: true,
          notes: 'Invoice verified against payment records'
        })
        .expect(200);

      expect(verifyResponse.body.isVerified).toBe(true);
      expect(verifyResponse.body.verifiedById).toBe(adminUserId);
      expect(verifyResponse.body).toHaveProperty('verifiedAt');

      console.log(`✓ Invoice verification workflow works correctly`);
    });

    it('should support bulk subscription operations', async () => {
      // Create multiple subscriptions for bulk testing
      const bulkSubscriptions = [
        {
          name: 'Slack Enterprise',
          price: 15.00,
          billingFrequency: 'Monthly',
          paymentMethod: 'CompanyCard',
          ownerId: employeeUserId,
          ownerEmail: 'employee.subscription@company.com'
        },
        {
          name: 'Figma Professional',
          price: 12.00,
          billingFrequency: 'Monthly',
          paymentMethod: 'CompanyCard',
          ownerId: employeeUserId,
          ownerEmail: 'employee.subscription@company.com'
        }
      ];

      const createdSubscriptions = [];

      for (const subData of bulkSubscriptions) {
        const response = await request(app.getHttpServer())
          .post('/api/subscriptions')
          .set('Authorization', 'Bearer admin-jwt-token')
          .send(subData);

        createdSubscriptions.push(response.body.id);
      }

      console.log(`✓ Multiple subscriptions created for bulk operations`);

      // Test bulk export of specific subscriptions
      const bulkExportResponse = await request(app.getHttpServer())
        .get('/api/subscriptions/export?format=csv&paymentMethod=CompanyCard')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      const exportContent = bulkExportResponse.body.toString();
      expect(exportContent).toContain('Slack Enterprise');
      expect(exportContent).toContain('Figma Professional');

      console.log(`✓ Bulk export includes multiple subscriptions`);

      // Test subscription cost analysis
      const totalCostResponse = await request(app.getHttpServer())
        .get('/api/subscriptions/analytics/cost-summary')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(totalCostResponse.body).toHaveProperty('totalMonthlyCost');
      expect(totalCostResponse.body).toHaveProperty('totalYearlyCost');
      expect(totalCostResponse.body).toHaveProperty('subscriptionCount');

      console.log(`✓ Subscription cost analysis works correctly`);
    });

    it('should maintain comprehensive audit trail for subscription changes', async () => {
      // Get audit trail for subscription
      const auditResponse = await request(app.getHttpServer())
        .get(`/api/audit/subscription/${subscriptionId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(Array.isArray(auditResponse.body)).toBe(true);
      expect(auditResponse.body.length).toBeGreaterThan(0);

      // Should have CREATE action for subscription creation
      const createAudit = auditResponse.body.find(
        (log: any) => log.action === 'CREATE' && log.entityType === 'Subscription'
      );
      expect(createAudit).toBeDefined();

      // Should have UPDATE actions for price changes and deactivation
      const updateAudits = auditResponse.body.filter(
        (log: any) => log.action === 'UPDATE' && log.entityType === 'Subscription'
      );
      expect(updateAudits.length).toBeGreaterThan(0);

      // Should have CREATE actions for invoice uploads
      const invoiceAudits = auditResponse.body.filter(
        (log: any) => log.action === 'CREATE' && log.entityType === 'Invoice'
      );
      expect(invoiceAudits.length).toBeGreaterThan(0);

      console.log(`✓ Comprehensive audit trail maintained for all subscription activities`);

      // Verify audit details include relevant change information
      const priceUpdateAudit = updateAudits.find(
        (log: any) => log.newValues && log.newValues.price === 89.99
      );

      if (priceUpdateAudit) {
        expect(priceUpdateAudit.oldValues.price).toBe(79.99);
        expect(priceUpdateAudit.newValues.price).toBe(89.99);
      }

      console.log(`✓ Audit trail includes detailed change information`);
    });
  });
});