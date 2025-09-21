import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

describe('Equipment Assignment Integration Tests (T022)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let adminUserId: string;
  let employeeUserId: string;
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

    // Set up test data - create users, team, and equipment
    const teamData = {
      name: 'Development Team',
      description: 'Software development team for integration testing'
    };

    const teamResponse = await request(app.getHttpServer())
      .post('/api/teams')
      .set('Authorization', 'Bearer admin-jwt-token')
      .send(teamData);

    const teamId = teamResponse.body.id;

    // Create admin user
    const adminData = {
      email: 'admin@company.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'Admin',
      teamId: teamId
    };

    const adminResponse = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', 'Bearer admin-jwt-token')
      .send(adminData);

    adminUserId = adminResponse.body.id;

    // Set team lead
    await request(app.getHttpServer())
      .put(`/api/teams/${teamId}`)
      .set('Authorization', 'Bearer admin-jwt-token')
      .send({ leadId: adminUserId });

    // Create employee user
    const employeeData = {
      email: 'employee@company.com',
      firstName: 'John',
      lastName: 'Doe',
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

  describe('Scenario 1: Equipment Assignment and Viewing', () => {
    it('should complete full equipment registration, assignment, and viewing workflow', async () => {
      // Step 1: Admin registers new equipment
      const equipmentData = {
        serialNumber: 'LAPTOP-INT-001',
        brand: 'Apple',
        model: 'MacBook Pro 16-inch',
        type: 'Laptop',
        status: 'Available',
        purchaseDate: '2024-01-15',
        classificationTag: 'Profico',
        condition: 'New',
        notes: 'New laptop for integration testing'
      };

      const equipmentResponse = await request(app.getHttpServer())
        .post('/api/equipment')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(equipmentData)
        .expect(201);

      equipmentId = equipmentResponse.body.id;

      // Verify QR code auto-generated
      expect(equipmentResponse.body).toHaveProperty('qrCode');
      expect(equipmentResponse.body.qrCode).toBeDefined();
      expect(equipmentResponse.body.qrCode).not.toBeNull();
      expect(equipmentResponse.body.status).toBe('Available');

      console.log(`✓ Equipment registered with ID: ${equipmentId} and QR: ${equipmentResponse.body.qrCode}`);

      // Step 2: Admin assigns equipment to employee
      const transferData = {
        toUserId: employeeUserId,
        transferType: 'Assignment',
        reason: 'Initial assignment for integration testing'
      };

      const transferResponse = await request(app.getHttpServer())
        .post(`/api/equipment/${equipmentId}/transfer`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(transferData)
        .expect(201);

      // Verify transfer record created
      expect(transferResponse.body).toHaveProperty('id');
      expect(transferResponse.body.equipmentId).toBe(equipmentId);
      expect(transferResponse.body.toUserId).toBe(employeeUserId);
      expect(transferResponse.body.transferType).toBe('Assignment');
      expect(transferResponse.body).toHaveProperty('adminConfirmed', true);

      console.log(`✓ Transfer record created: ${transferResponse.body.id}`);

      // Verify equipment status updated to "Assigned"
      const equipmentCheck = await request(app.getHttpServer())
        .get(`/api/equipment/${equipmentId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(equipmentCheck.body.status).toBe('Assigned');
      expect(equipmentCheck.body.currentOwnerId).toBe(employeeUserId);

      console.log(`✓ Equipment status updated to Assigned`);

      // Step 3: Employee views assigned equipment
      const userResponse = await request(app.getHttpServer())
        .get(`/api/users/${employeeUserId}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .expect(200);

      // Verify assigned equipment listed
      expect(userResponse.body).toHaveProperty('assignedEquipment');
      expect(Array.isArray(userResponse.body.assignedEquipment)).toBe(true);
      expect(userResponse.body.assignedEquipment.length).toBeGreaterThan(0);

      const assignedEquipment = userResponse.body.assignedEquipment.find(
        (eq: any) => eq.id === equipmentId
      );

      expect(assignedEquipment).toBeDefined();
      expect(assignedEquipment.serialNumber).toBe(equipmentData.serialNumber);
      expect(assignedEquipment.brand).toBe(equipmentData.brand);
      expect(assignedEquipment.model).toBe(equipmentData.model);
      expect(assignedEquipment.type).toBe(equipmentData.type);
      expect(assignedEquipment.condition).toBe(equipmentData.condition);
      expect(assignedEquipment).toHaveProperty('qrCode');

      console.log(`✓ Employee can view assigned equipment with all details`);

      // Step 4: Verify QR code and condition status visible
      expect(assignedEquipment.qrCode).toBeDefined();
      expect(assignedEquipment.qrCode).not.toBeNull();
      expect(['New', 'Good', 'Fair', 'Poor']).toContain(assignedEquipment.condition);

      console.log(`✓ QR code and condition status properly visible`);

      // Step 5: Test equipment lookup via QR code
      const qrCode = assignedEquipment.qrCode;
      const qrResponse = await request(app.getHttpServer())
        .get(`/api/equipment/qr/${qrCode}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .expect(200);

      expect(qrResponse.body.id).toBe(equipmentId);
      expect(qrResponse.body.serialNumber).toBe(equipmentData.serialNumber);
      expect(qrResponse.body.currentOwnerId).toBe(employeeUserId);

      console.log(`✓ QR code lookup works correctly`);

      // Step 6: Verify audit trail creation
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

      // Should have CREATE action for transfer
      const transferAudit = auditResponse.body.find(
        (log: any) => log.action === 'CREATE' && log.entityType === 'Transfer'
      );
      expect(transferAudit).toBeDefined();

      console.log(`✓ Audit trail properly created for all actions`);
    });

    it('should handle role-based equipment visibility correctly', async () => {
      // Employee should only see their own equipment
      const employeeEquipmentResponse = await request(app.getHttpServer())
        .get('/api/equipment')
        .set('Authorization', 'Bearer employee-jwt-token')
        .expect(200);

      expect(employeeEquipmentResponse.body).toHaveProperty('equipment');
      expect(Array.isArray(employeeEquipmentResponse.body.equipment)).toBe(true);

      // All equipment should belong to the employee
      employeeEquipmentResponse.body.equipment.forEach((equipment: any) => {
        expect(equipment.currentOwnerId).toBe(employeeUserId);
      });

      console.log(`✓ Employee sees only their own equipment`);

      // Admin should see all equipment
      const adminEquipmentResponse = await request(app.getHttpServer())
        .get('/api/equipment')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(adminEquipmentResponse.body.equipment.length).toBeGreaterThanOrEqual(
        employeeEquipmentResponse.body.equipment.length
      );

      console.log(`✓ Admin sees all equipment in system`);
    });

    it('should support equipment filtering and search', async () => {
      // Create additional equipment for filtering tests
      const additionalEquipment = [
        {
          serialNumber: 'DISPLAY-INT-001',
          brand: 'Dell',
          model: 'UltraSharp 27',
          type: 'Display',
          status: 'Available',
          purchaseDate: '2024-01-15',
          classificationTag: 'Profico',
          condition: 'New'
        },
        {
          serialNumber: 'PHONE-INT-001',
          brand: 'Apple',
          model: 'iPhone 15 Pro',
          type: 'Phone',
          status: 'Available',
          purchaseDate: '2024-01-15',
          classificationTag: 'ZOPI',
          condition: 'New'
        }
      ];

      for (const equipment of additionalEquipment) {
        await request(app.getHttpServer())
          .post('/api/equipment')
          .set('Authorization', 'Bearer admin-jwt-token')
          .send(equipment);
      }

      // Test filtering by type
      const laptopFilter = await request(app.getHttpServer())
        .get('/api/equipment?type=Laptop')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      laptopFilter.body.equipment.forEach((equipment: any) => {
        expect(equipment.type).toBe('Laptop');
      });

      console.log(`✓ Equipment filtering by type works`);

      // Test filtering by status
      const availableFilter = await request(app.getHttpServer())
        .get('/api/equipment?status=Available')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      availableFilter.body.equipment.forEach((equipment: any) => {
        expect(equipment.status).toBe('Available');
      });

      console.log(`✓ Equipment filtering by status works`);

      // Test filtering by classification tag
      const proficoFilter = await request(app.getHttpServer())
        .get('/api/equipment?classificationTag=Profico')
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      proficoFilter.body.equipment.forEach((equipment: any) => {
        expect(equipment.classificationTag).toBe('Profico');
      });

      console.log(`✓ Equipment filtering by classification tag works`);
    });

    it('should handle equipment condition updates properly', async () => {
      // Employee updates equipment condition
      const conditionUpdateData = {
        condition: 'Good',
        notes: 'Minor wear from daily usage, but functioning well'
      };

      const updateResponse = await request(app.getHttpServer())
        .put(`/api/equipment/${equipmentId}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(conditionUpdateData)
        .expect(200);

      expect(updateResponse.body.condition).toBe('Good');
      expect(updateResponse.body.notes).toContain('Minor wear from daily usage');

      console.log(`✓ Employee can update equipment condition`);

      // Verify audit log for condition update
      const auditResponse = await request(app.getHttpServer())
        .get(`/api/audit/equipment/${equipmentId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      const updateAudit = auditResponse.body.find(
        (log: any) => log.action === 'UPDATE' &&
        log.newValues && log.newValues.condition === 'Good'
      );

      expect(updateAudit).toBeDefined();
      expect(updateAudit.oldValues.condition).toBe('New');
      expect(updateAudit.newValues.condition).toBe('Good');

      console.log(`✓ Condition update properly logged in audit trail`);
    });

    it('should support equipment transfer between users', async () => {
      // Create another employee for transfer testing
      const employee2Data = {
        email: 'employee2@company.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'Employee',
        teamId: employeeUserId // Use same team
      };

      const employee2Response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(employee2Data);

      const employee2Id = employee2Response.body.id;

      // Admin initiates transfer
      const transferData = {
        fromUserId: employeeUserId,
        toUserId: employee2Id,
        transferType: 'Transfer',
        reason: 'Transferring to different team member for project needs'
      };

      const transferResponse = await request(app.getHttpServer())
        .post(`/api/equipment/${equipmentId}/transfer`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(transferData)
        .expect(201);

      expect(transferResponse.body.fromUserId).toBe(employeeUserId);
      expect(transferResponse.body.toUserId).toBe(employee2Id);
      expect(transferResponse.body.transferType).toBe('Transfer');

      // Verify equipment now belongs to second employee
      const equipmentCheck = await request(app.getHttpServer())
        .get(`/api/equipment/${equipmentId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(equipmentCheck.body.currentOwnerId).toBe(employee2Id);

      // First employee should no longer see it in their assigned equipment
      const user1Check = await request(app.getHttpServer())
        .get(`/api/users/${employeeUserId}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .expect(200);

      const stillAssigned = user1Check.body.assignedEquipment.find(
        (eq: any) => eq.id === equipmentId
      );
      expect(stillAssigned).toBeUndefined();

      // Second employee should now see it
      const user2Check = await request(app.getHttpServer())
        .get(`/api/users/${employee2Id}`)
        .set('Authorization', 'Bearer employee2-jwt-token')
        .expect(200);

      const newlyAssigned = user2Check.body.assignedEquipment.find(
        (eq: any) => eq.id === equipmentId
      );
      expect(newlyAssigned).toBeDefined();

      console.log(`✓ Equipment transfer between users works correctly`);
    });

    it('should maintain complete transfer history', async () => {
      // Get transfer history for the equipment
      const transferHistory = await request(app.getHttpServer())
        .get(`/api/equipment/${equipmentId}/transfers`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(200);

      expect(Array.isArray(transferHistory.body)).toBe(true);
      expect(transferHistory.body.length).toBeGreaterThanOrEqual(2); // Initial assignment + transfer

      // Verify chronological order
      const transfers = transferHistory.body.sort(
        (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // First transfer: Assignment to first employee
      expect(transfers[0].transferType).toBe('Assignment');
      expect(transfers[0].toUserId).toBe(employeeUserId);
      expect(transfers[0].fromUserId).toBeNull();

      // Second transfer: Transfer to second employee
      expect(transfers[1].transferType).toBe('Transfer');
      expect(transfers[1].fromUserId).toBe(employeeUserId);

      console.log(`✓ Complete transfer history maintained correctly`);
    });
  });
});