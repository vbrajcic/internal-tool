import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Users CRUD API Contract Tests', () => {
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

  describe('PUT /api/users/{id}', () => {
    it('should update user with valid data', async () => {
      const userId = 'existing-user-uuid';
      const updateData = {
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        role: 'TeamLead',
        teamId: 'new-team-uuid'
      };

      const response = await request(app.getHttpServer())
        .put(`/api/users/${userId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', userId);
      expect(response.body.firstName).toBe(updateData.firstName);
      expect(response.body.lastName).toBe(updateData.lastName);
      expect(response.body.role).toBe(updateData.role);
      expect(response.body.teamId).toBe(updateData.teamId);
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should validate role change permissions', async () => {
      const userId = 'existing-user-uuid';
      const updateData = {
        role: 'Admin'
      };

      // Only admin can change roles
      await request(app.getHttpServer())
        .put(`/api/users/${userId}`)
        .set('Authorization', 'Bearer teamlead-jwt-token')
        .send(updateData)
        .expect(403);
    });

    it('should prevent updating non-existent user', async () => {
      const nonExistentId = 'non-existent-uuid';
      const updateData = {
        firstName: 'Test'
      };

      await request(app.getHttpServer())
        .put(`/api/users/${nonExistentId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(updateData)
        .expect(404);
    });

    it('should validate team assignment', async () => {
      const userId = 'existing-user-uuid';
      const updateData = {
        teamId: 'non-existent-team-uuid'
      };

      await request(app.getHttpServer())
        .put(`/api/users/${userId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(updateData)
        .expect(400);
    });
  });

  describe('POST /api/users/{id}/deactivate', () => {
    it('should deactivate user and transfer equipment', async () => {
      const userId = 'active-user-uuid';
      const deactivationData = {
        reason: 'Employee left company',
        transferEquipmentTo: 'replacement-user-uuid'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/users/${userId}/deactivate`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(deactivationData)
        .expect(200);

      expect(response.body).toHaveProperty('id', userId);
      expect(response.body.isActive).toBe(false);
      expect(response.body).toHaveProperty('deactivatedAt');
    });

    it('should preserve audit trail when deactivating', async () => {
      const userId = 'active-user-uuid';
      const deactivationData = {
        reason: 'Role eliminated'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/users/${userId}/deactivate`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(deactivationData)
        .expect(200);

      // User should still exist but be inactive
      expect(response.body.isActive).toBe(false);

      // Equipment should be returned to pool if no transfer target
      expect(response.body).toHaveProperty('equipmentTransferred');
    });

    it('should require admin role for deactivation', async () => {
      const userId = 'active-user-uuid';
      const deactivationData = {
        reason: 'Test deactivation'
      };

      await request(app.getHttpServer())
        .post(`/api/users/${userId}/deactivate`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(deactivationData)
        .expect(403);
    });

    it('should validate equipment transfer target', async () => {
      const userId = 'active-user-uuid';
      const deactivationData = {
        reason: 'Employee transfer',
        transferEquipmentTo: 'inactive-user-uuid'
      };

      await request(app.getHttpServer())
        .post(`/api/users/${userId}/deactivate`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(deactivationData)
        .expect(400);
    });

    it('should prevent deactivating already inactive user', async () => {
      const userId = 'inactive-user-uuid';
      const deactivationData = {
        reason: 'Already inactive'
      };

      await request(app.getHttpServer())
        .post(`/api/users/${userId}/deactivate`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(deactivationData)
        .expect(400);
    });
  });
});