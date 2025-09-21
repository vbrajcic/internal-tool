import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Equipment CRUD API Contract Tests', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('PUT /api/equipment/{id}', () => {
    it('should update equipment with valid data', async () => {
      const equipmentId = 'existing-equipment-uuid';
      const updateData = {
        brand: 'Updated Brand',
        model: 'Updated Model',
        status: 'Broken',
        condition: 'Poor',
        notes: 'Equipment damaged, needs repair'
      };

      const response = await request(app.getHttpServer())
        .put(`/api/equipment/${equipmentId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', equipmentId);
      expect(response.body.brand).toBe(updateData.brand);
      expect(response.body.model).toBe(updateData.model);
      expect(response.body.status).toBe(updateData.status);
      expect(response.body.condition).toBe(updateData.condition);
      expect(response.body.notes).toBe(updateData.notes);
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should validate equipment status transitions', async () => {
      const equipmentId = 'assigned-equipment-uuid';
      const invalidUpdate = {
        status: 'Available' // Cannot directly change from Assigned to Available
      };

      await request(app.getHttpServer())
        .put(`/api/equipment/${equipmentId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(invalidUpdate)
        .expect(400);
    });

    it('should allow condition reporting by current owner', async () => {
      const equipmentId = 'user-owned-equipment-uuid';
      const conditionUpdate = {
        condition: 'Fair',
        notes: 'Screen has minor scratches'
      };

      const response = await request(app.getHttpServer())
        .put(`/api/equipment/${equipmentId}`)
        .set('Authorization', 'Bearer equipment-owner-jwt-token')
        .send(conditionUpdate)
        .expect(200);

      expect(response.body.condition).toBe(conditionUpdate.condition);
      expect(response.body.notes).toBe(conditionUpdate.notes);
    });

    it('should prevent unauthorized equipment updates', async () => {
      const equipmentId = 'other-user-equipment-uuid';
      const updateData = {
        condition: 'Poor'
      };

      // Employee cannot update equipment they don't own
      await request(app.getHttpServer())
        .put(`/api/equipment/${equipmentId}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(updateData)
        .expect(403);
    });

    it('should validate enum values', async () => {
      const equipmentId = 'existing-equipment-uuid';
      const invalidData = {
        status: 'InvalidStatus',
        condition: 'InvalidCondition'
      };

      await request(app.getHttpServer())
        .put(`/api/equipment/${equipmentId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('POST /api/equipment/{id}/transfer', () => {
    it('should initiate equipment transfer with valid data', async () => {
      const equipmentId = 'available-equipment-uuid';
      const transferData = {
        toUserId: 'target-user-uuid',
        reason: 'New employee assignment'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/equipment/${equipmentId}/transfer`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(transferData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.equipmentId).toBe(equipmentId);
      expect(response.body.toUserId).toBe(transferData.toUserId);
      expect(response.body.reason).toBe(transferData.reason);
      expect(response.body.transferType).toBe('Assignment');
      expect(response.body.fromUserConfirmed).toBe(false);
      expect(response.body.toUserConfirmed).toBe(false);
      expect(response.body.adminConfirmed).toBe(false);
    });

    it('should handle equipment return to pool', async () => {
      const equipmentId = 'assigned-equipment-uuid';
      const returnData = {
        toUserId: null, // Return to pool
        reason: 'Employee departure'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/equipment/${equipmentId}/transfer`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(returnData)
        .expect(201);

      expect(response.body.toUserId).toBeNull();
      expect(response.body.transferType).toBe('Return');
    });

    it('should handle transfer between users', async () => {
      const equipmentId = 'user-assigned-equipment-uuid';
      const transferData = {
        toUserId: 'different-user-uuid',
        reason: 'Role change requires different equipment'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/equipment/${equipmentId}/transfer`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(transferData)
        .expect(201);

      expect(response.body.transferType).toBe('Transfer');
      expect(response.body).toHaveProperty('fromUserId');
      expect(response.body.toUserId).toBe(transferData.toUserId);
    });

    it('should validate transfer permissions', async () => {
      const equipmentId = 'admin-equipment-uuid';
      const transferData = {
        toUserId: 'employee-user-uuid',
        reason: 'Unauthorized transfer attempt'
      };

      // Regular employee cannot initiate transfers
      await request(app.getHttpServer())
        .post(`/api/equipment/${equipmentId}/transfer`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(transferData)
        .expect(403);
    });

    it('should prevent transfer to inactive user', async () => {
      const equipmentId = 'available-equipment-uuid';
      const transferData = {
        toUserId: 'inactive-user-uuid',
        reason: 'Should fail - user inactive'
      };

      await request(app.getHttpServer())
        .post(`/api/equipment/${equipmentId}/transfer`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(transferData)
        .expect(400);
    });

    it('should prevent transfer of already pending equipment', async () => {
      const equipmentId = 'pending-transfer-equipment-uuid';
      const transferData = {
        toUserId: 'user-uuid',
        reason: 'Should fail - already pending'
      };

      await request(app.getHttpServer())
        .post(`/api/equipment/${equipmentId}/transfer`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(transferData)
        .expect(400);
    });

    it('should require reason for all transfers', async () => {
      const equipmentId = 'available-equipment-uuid';
      const transferData = {
        toUserId: 'user-uuid'
        // Missing reason
      };

      await request(app.getHttpServer())
        .post(`/api/equipment/${equipmentId}/transfer`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(transferData)
        .expect(400);
    });

    it('should handle equipment decommissioning', async () => {
      const equipmentId = 'old-equipment-uuid';
      const decommissionData = {
        toUserId: null,
        reason: 'Equipment end-of-life, being decommissioned'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/equipment/${equipmentId}/transfer`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(decommissionData)
        .expect(201);

      expect(response.body.transferType).toBe('Decommission');
    });
  });
});