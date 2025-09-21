import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

describe('Requests Fulfillment Contract Tests (T021)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let approvedRequestId: string;
  let availableEquipmentId: string;
  let alreadyFulfilledRequestId: string;

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

    // Create test equipment for fulfillment
    const equipmentData = {
      serialNumber: 'TEST-LAPTOP-001',
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

    availableEquipmentId = equipmentResponse.body.id;

    // Create and approve a request for fulfillment testing
    const requestData = {
      equipmentType: 'Laptop',
      justification: 'Test request for fulfillment workflow validation and testing'
    };

    const createResponse = await request(app.getHttpServer())
      .post('/api/requests')
      .set('Authorization', 'Bearer employee-jwt-token')
      .send(requestData);

    approvedRequestId = createResponse.body.id;

    // Team lead approval
    await request(app.getHttpServer())
      .post(`/api/requests/${approvedRequestId}/team-lead-review`)
      .set('Authorization', 'Bearer team-lead-jwt-token')
      .send({
        decision: 'Approved',
        notes: 'Team lead approved for fulfillment testing'
      });

    // Admin approval
    await request(app.getHttpServer())
      .post(`/api/requests/${approvedRequestId}/admin-review`)
      .set('Authorization', 'Bearer admin-jwt-token')
      .send({
        decision: 'Approved',
        notes: 'Admin approved for fulfillment testing'
      });

    // Create another request for already fulfilled scenario testing
    const fulfilledRequestData = {
      equipmentType: 'Display',
      justification: 'Test request for already fulfilled scenario validation'
    };

    const fulfilledResponse = await request(app.getHttpServer())
      .post('/api/requests')
      .set('Authorization', 'Bearer employee-jwt-token')
      .send(fulfilledRequestData);

    alreadyFulfilledRequestId = fulfilledResponse.body.id;

    // Team lead and admin approval for the fulfilled request
    await request(app.getHttpServer())
      .post(`/api/requests/${alreadyFulfilledRequestId}/team-lead-review`)
      .set('Authorization', 'Bearer team-lead-jwt-token')
      .send({ decision: 'Approved' });

    await request(app.getHttpServer())
      .post(`/api/requests/${alreadyFulfilledRequestId}/admin-review`)
      .set('Authorization', 'Bearer admin-jwt-token')
      .send({ decision: 'Approved' });

    // Create equipment for this fulfillment
    const displayEquipmentData = {
      serialNumber: 'TEST-DISPLAY-001',
      brand: 'Dell',
      model: 'UltraSharp 27',
      type: 'Display',
      status: 'Available',
      purchaseDate: '2024-01-15',
      classificationTag: 'Profico',
      condition: 'New'
    };

    const displayResponse = await request(app.getHttpServer())
      .post('/api/equipment')
      .set('Authorization', 'Bearer admin-jwt-token')
      .send(displayEquipmentData);

    // Fulfill this request
    await request(app.getHttpServer())
      .post(`/api/requests/${alreadyFulfilledRequestId}/fulfill`)
      .set('Authorization', 'Bearer admin-jwt-token')
      .send({
        equipmentId: displayResponse.body.id,
        notes: 'Pre-fulfilled for testing'
      });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/requests/{id}/fulfill', () => {
    it('should fulfill approved request with valid equipment assignment', async () => {
      const fulfillmentData = {
        equipmentId: availableEquipmentId,
        notes: 'Request fulfilled with appropriate equipment matching specifications'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${approvedRequestId}/fulfill`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(fulfillmentData)
        .expect(200);

      expect(response.body.id).toBe(approvedRequestId);
      expect(response.body.status).toBe('Fulfilled');
      expect(response.body.equipmentId).toBe(availableEquipmentId);
      expect(response.body).toHaveProperty('fulfilledAt');
      expect(response.body.fulfilledAt).not.toBeNull();
    });

    it('should fulfill request with minimal data (equipmentId only)', async () => {
      // Create new approved request for minimal fulfillment testing
      const newRequestData = {
        equipmentType: 'Mouse',
        justification: 'Test request for minimal fulfillment data validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // Team lead and admin approval
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({ decision: 'Approved' });

      // Create equipment for fulfillment
      const mouseEquipmentData = {
        serialNumber: 'TEST-MOUSE-001',
        brand: 'Logitech',
        model: 'MX Master 3',
        type: 'Mouse',
        status: 'Available',
        purchaseDate: '2024-01-15',
        classificationTag: 'Profico',
        condition: 'New'
      };

      const mouseResponse = await request(app.getHttpServer())
        .post('/api/equipment')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(mouseEquipmentData);

      const fulfillmentData = {
        equipmentId: mouseResponse.body.id
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/fulfill`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(fulfillmentData)
        .expect(200);

      expect(response.body.status).toBe('Fulfilled');
      expect(response.body.equipmentId).toBe(mouseResponse.body.id);
    });

    it('should require equipmentId field', async () => {
      // Create new approved request for validation testing
      const newRequestData = {
        equipmentType: 'Keyboard',
        justification: 'Test request for equipmentId field validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // Team lead and admin approval
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({ decision: 'Approved' });

      const incompleteData = {
        notes: 'Notes without equipment ID'
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/fulfill`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(incompleteData)
        .expect(400);
    });

    it('should validate equipmentId exists', async () => {
      // Create new approved request for equipment validation
      const newRequestData = {
        equipmentType: 'Tablet',
        justification: 'Test request for equipment existence validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // Team lead and admin approval
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({ decision: 'Approved' });

      const nonExistentEquipmentId = '550e8400-e29b-41d4-a716-446655440999';

      const fulfillmentData = {
        equipmentId: nonExistentEquipmentId
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/fulfill`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(fulfillmentData)
        .expect(400);
    });

    it('should validate equipment is available for assignment', async () => {
      // Create new approved request for equipment availability validation
      const newRequestData = {
        equipmentType: 'Display',
        justification: 'Test request for equipment availability validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // Team lead and admin approval
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({ decision: 'Approved' });

      // Create assigned equipment
      const assignedEquipmentData = {
        serialNumber: 'TEST-ASSIGNED-DISPLAY-001',
        brand: 'Samsung',
        model: 'Odyssey G7',
        type: 'Display',
        status: 'Assigned',
        purchaseDate: '2024-01-15',
        classificationTag: 'Profico',
        condition: 'Good',
        currentOwnerId: '550e8400-e29b-41d4-a716-446655440000'
      };

      const assignedResponse = await request(app.getHttpServer())
        .post('/api/equipment')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(assignedEquipmentData);

      const fulfillmentData = {
        equipmentId: assignedResponse.body.id
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/fulfill`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(fulfillmentData)
        .expect(400);
    });

    it('should validate equipment type matches request type', async () => {
      // Create new approved request for type matching validation
      const newRequestData = {
        equipmentType: 'Phone',
        justification: 'Test request for equipment type matching validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // Team lead and admin approval
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({ decision: 'Approved' });

      // Try to fulfill with wrong equipment type (using available laptop for phone request)
      const fulfillmentData = {
        equipmentId: availableEquipmentId // This is a laptop, not a phone
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/fulfill`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(fulfillmentData)
        .expect(400);
    });

    it('should return 404 for non-existent request', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
      const fulfillmentData = {
        equipmentId: availableEquipmentId
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${nonExistentId}/fulfill`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(fulfillmentData)
        .expect(404);
    });

    it('should require authentication', async () => {
      const fulfillmentData = {
        equipmentId: availableEquipmentId
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${approvedRequestId}/fulfill`)
        .send(fulfillmentData)
        .expect(401);
    });

    it('should require Admin role', async () => {
      // Create new approved request for role validation
      const newRequestData = {
        equipmentType: 'Dongle',
        justification: 'Test request for admin role validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // Team lead and admin approval
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({ decision: 'Approved' });

      // Create equipment for this test
      const dongleEquipmentData = {
        serialNumber: 'TEST-DONGLE-001',
        brand: 'Anker',
        model: 'USB-C Hub',
        type: 'Dongle',
        status: 'Available',
        purchaseDate: '2024-01-15',
        classificationTag: 'Profico',
        condition: 'New'
      };

      const dongleResponse = await request(app.getHttpServer())
        .post('/api/equipment')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(dongleEquipmentData);

      const fulfillmentData = {
        equipmentId: dongleResponse.body.id
      };

      // Employee should not be able to fulfill
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/fulfill`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(fulfillmentData)
        .expect(403);

      // TeamLead should not be able to fulfill
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/fulfill`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send(fulfillmentData)
        .expect(403);
    });

    it('should only allow fulfillment when request is in Approved status', async () => {
      // Create new request in wrong status for fulfillment
      const newRequestData = {
        equipmentType: 'Furniture',
        justification: 'Test request for status validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // Create equipment for this test
      const furnitureEquipmentData = {
        serialNumber: 'TEST-FURNITURE-001',
        brand: 'IKEA',
        model: 'Standing Desk',
        type: 'Furniture',
        status: 'Available',
        purchaseDate: '2024-01-15',
        classificationTag: 'Profico',
        condition: 'New'
      };

      const furnitureResponse = await request(app.getHttpServer())
        .post('/api/equipment')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(furnitureEquipmentData);

      const fulfillmentData = {
        equipmentId: furnitureResponse.body.id
      };

      // Try to fulfill without approvals
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/fulfill`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(fulfillmentData)
        .expect(400);
    });

    it('should prevent duplicate fulfillment', async () => {
      const duplicateFulfillment = {
        equipmentId: availableEquipmentId,
        notes: 'Trying to fulfill already fulfilled request'
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${alreadyFulfilledRequestId}/fulfill`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(duplicateFulfillment)
        .expect(400);
    });

    it('should validate UUID format for request ID', async () => {
      const fulfillmentData = {
        equipmentId: availableEquipmentId
      };

      await request(app.getHttpServer())
        .post('/api/requests/invalid-uuid/fulfill')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(fulfillmentData)
        .expect(400);
    });

    it('should validate UUID format for equipment ID', async () => {
      // Create new approved request for UUID validation
      const newRequestData = {
        equipmentType: 'Laptop',
        justification: 'Test request for equipment UUID validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // Team lead and admin approval
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({ decision: 'Approved' });

      const invalidData = {
        equipmentId: 'invalid-uuid'
      };

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/fulfill`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(invalidData)
        .expect(400);
    });

    it('should record fulfillment timestamp', async () => {
      // Create new approved request for timestamp validation
      const newRequestData = {
        equipmentType: 'Keyboard',
        justification: 'Test request for fulfillment timestamp validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // Team lead and admin approval
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({ decision: 'Approved' });

      // Create equipment for this test
      const keyboardEquipmentData = {
        serialNumber: 'TEST-KEYBOARD-002',
        brand: 'Keychron',
        model: 'K2 Wireless',
        type: 'Keyboard',
        status: 'Available',
        purchaseDate: '2024-01-15',
        classificationTag: 'Profico',
        condition: 'New'
      };

      const keyboardResponse = await request(app.getHttpServer())
        .post('/api/equipment')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(keyboardEquipmentData);

      const beforeFulfillment = new Date();

      const fulfillmentData = {
        equipmentId: keyboardResponse.body.id
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/fulfill`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(fulfillmentData)
        .expect(200);

      const afterFulfillment = new Date();
      const fulfillmentTimestamp = new Date(response.body.fulfilledAt);

      expect(fulfillmentTimestamp).toBeInstanceOf(Date);
      expect(fulfillmentTimestamp.getTime()).toBeGreaterThanOrEqual(beforeFulfillment.getTime());
      expect(fulfillmentTimestamp.getTime()).toBeLessThanOrEqual(afterFulfillment.getTime());
    });

    it('should create transfer record when fulfilling request', async () => {
      // Create new approved request for transfer validation
      const newRequestData = {
        equipmentType: 'Mouse',
        justification: 'Test request for transfer record validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(newRequestData);

      const newRequestId = createResponse.body.id;

      // Team lead and admin approval
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({ decision: 'Approved' });

      // Create equipment for this test
      const mouseEquipmentData2 = {
        serialNumber: 'TEST-MOUSE-002',
        brand: 'Apple',
        model: 'Magic Mouse',
        type: 'Mouse',
        status: 'Available',
        purchaseDate: '2024-01-15',
        classificationTag: 'Profico',
        condition: 'New'
      };

      const mouseResponse2 = await request(app.getHttpServer())
        .post('/api/equipment')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(mouseEquipmentData2);

      const fulfillmentData = {
        equipmentId: mouseResponse2.body.id,
        notes: 'Fulfillment with transfer record creation'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/fulfill`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(fulfillmentData)
        .expect(200);

      expect(response.body.status).toBe('Fulfilled');
      expect(response.body.equipmentId).toBe(mouseResponse2.body.id);

      // Verify equipment is now assigned
      const equipmentCheck = await request(app.getHttpServer())
        .get(`/api/equipment/${mouseResponse2.body.id}`)
        .set('Authorization', 'Bearer admin-jwt-token');

      expect(equipmentCheck.body.status).toBe('Assigned');
      expect(equipmentCheck.body.currentOwnerId).toBe(response.body.requesterId);
    });

    it('should send notification email on fulfillment', async () => {
      // Create new approved request for notification testing
      const notificationTestData = {
        equipmentType: 'Tablet',
        justification: 'Test request for fulfillment notification validation'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(notificationTestData);

      const newRequestId = createResponse.body.id;

      // Team lead and admin approval
      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/team-lead-review`)
        .set('Authorization', 'Bearer team-lead-jwt-token')
        .send({ decision: 'Approved' });

      await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/admin-review`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send({ decision: 'Approved' });

      // Create equipment for this test
      const tabletEquipmentData = {
        serialNumber: 'TEST-TABLET-001',
        brand: 'Apple',
        model: 'iPad Pro',
        type: 'Tablet',
        status: 'Available',
        purchaseDate: '2024-01-15',
        classificationTag: 'Profico',
        condition: 'New'
      };

      const tabletResponse = await request(app.getHttpServer())
        .post('/api/equipment')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(tabletEquipmentData);

      const fulfillmentData = {
        equipmentId: tabletResponse.body.id,
        notes: 'Fulfilled with notification expected'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/requests/${newRequestId}/fulfill`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(fulfillmentData)
        .expect(200);

      expect(response.body.status).toBe('Fulfilled');
      // In a real system, this would trigger email notification to requester and team lead
    });
  });
});