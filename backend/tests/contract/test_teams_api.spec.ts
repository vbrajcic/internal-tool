import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Teams API Contract Tests', () => {
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

  describe('GET /api/teams', () => {
    it('should return all teams list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/teams')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      response.body.forEach((team: any) => {
        expect(team).toHaveProperty('id');
        expect(team).toHaveProperty('name');
        expect(team).toHaveProperty('leadId');
        expect(team).toHaveProperty('description');
        expect(team).toHaveProperty('createdAt');
      });
    });

    it('should include team lead information', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/teams')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      const teamWithLead = response.body.find((team: any) => team.leadId);
      if (teamWithLead) {
        expect(teamWithLead).toHaveProperty('lead');
        expect(teamWithLead.lead).toHaveProperty('firstName');
        expect(teamWithLead.lead).toHaveProperty('lastName');
        expect(teamWithLead.lead).toHaveProperty('email');
      }
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/teams')
        .expect(401);
    });
  });

  describe('POST /api/teams', () => {
    it('should create new team with valid data', async () => {
      const teamData = {
        name: 'Engineering Team',
        leadId: 'team-lead-user-uuid',
        description: 'Software development team'
      };

      const response = await request(app.getHttpServer())
        .post('/api/teams')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(teamData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(teamData.name);
      expect(response.body.leadId).toBe(teamData.leadId);
      expect(response.body.description).toBe(teamData.description);
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should validate team lead has appropriate role', async () => {
      const teamData = {
        name: 'Test Team',
        leadId: 'employee-user-uuid', // Employee, not TeamLead or Admin
        description: 'Test team'
      };

      await request(app.getHttpServer())
        .post('/api/teams')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(teamData)
        .expect(400);
    });

    it('should prevent duplicate team names', async () => {
      const teamData = {
        name: 'Existing Team Name',
        leadId: 'team-lead-user-uuid',
        description: 'Duplicate name test'
      };

      await request(app.getHttpServer())
        .post('/api/teams')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(teamData)
        .expect(409);
    });

    it('should require admin role for team creation', async () => {
      const teamData = {
        name: 'Unauthorized Team',
        leadId: 'team-lead-user-uuid',
        description: 'Should fail'
      };

      await request(app.getHttpServer())
        .post('/api/teams')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(teamData)
        .expect(403);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        description: 'Missing name and leadId'
      };

      await request(app.getHttpServer())
        .post('/api/teams')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /api/teams/{id}', () => {
    it('should return team details with members', async () => {
      const teamId = 'existing-team-uuid';

      const response = await request(app.getHttpServer())
        .get(`/api/teams/${teamId}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body).toHaveProperty('id', teamId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('lead');
      expect(response.body).toHaveProperty('members');
      expect(response.body).toHaveProperty('teamEquipment');

      expect(response.body.members).toBeInstanceOf(Array);
      expect(response.body.teamEquipment).toBeInstanceOf(Array);
    });

    it('should enforce team visibility for team leads', async () => {
      const teamId = 'other-team-uuid';

      // Team lead should only see their own team details
      await request(app.getHttpServer())
        .get(`/api/teams/${teamId}`)
        .set('Authorization', 'Bearer teamlead-different-team-jwt')
        .expect(403);
    });

    it('should return 404 for non-existent team', async () => {
      const nonExistentId = 'non-existent-team-uuid';

      await request(app.getHttpServer())
        .get(`/api/teams/${nonExistentId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(404);
    });
  });

  describe('PUT /api/teams/{id}', () => {
    it('should update team with valid data', async () => {
      const teamId = 'existing-team-uuid';
      const updateData = {
        name: 'Updated Team Name',
        leadId: 'new-team-lead-uuid',
        description: 'Updated description'
      };

      const response = await request(app.getHttpServer())
        .put(`/api/teams/${teamId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', teamId);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.leadId).toBe(updateData.leadId);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should validate new team lead role', async () => {
      const teamId = 'existing-team-uuid';
      const updateData = {
        leadId: 'employee-user-uuid' // Employee role, not valid for team lead
      };

      await request(app.getHttpServer())
        .put(`/api/teams/${teamId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(updateData)
        .expect(400);
    });

    it('should handle team lead changes with member notifications', async () => {
      const teamId = 'existing-team-uuid';
      const updateData = {
        leadId: 'new-valid-team-lead-uuid'
      };

      const response = await request(app.getHttpServer())
        .put(`/api/teams/${teamId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(updateData)
        .expect(200);

      expect(response.body.leadId).toBe(updateData.leadId);
      // Should trigger notifications to team members about lead change
    });

    it('should require admin role for team updates', async () => {
      const teamId = 'existing-team-uuid';
      const updateData = {
        description: 'Unauthorized update'
      };

      await request(app.getHttpServer())
        .put(`/api/teams/${teamId}`)
        .set('Authorization', 'Bearer teamlead-jwt-token')
        .send(updateData)
        .expect(403);
    });

    it('should prevent updating to duplicate team name', async () => {
      const teamId = 'existing-team-uuid';
      const updateData = {
        name: 'Another Existing Team Name'
      };

      await request(app.getHttpServer())
        .put(`/api/teams/${teamId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(updateData)
        .expect(409);
    });
  });
});