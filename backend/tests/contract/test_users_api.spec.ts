import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Users API Contract Tests', () => {
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

  describe('GET /api/users', () => {
    it('should return users list with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.users).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
    });

    it('should filter users by role', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users?role=Admin')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body.users).toBeInstanceOf(Array);
      response.body.users.forEach((user: any) => {
        expect(user.role).toBe('Admin');
      });
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .expect(401);
    });
  });

  describe('POST /api/users', () => {
    it('should create new user with valid data', async () => {
      const userData = {
        email: 'test@company.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'Employee',
        teamId: 'uuid-team-id'
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(userData.email);
      expect(response.body.firstName).toBe(userData.firstName);
      expect(response.body.lastName).toBe(userData.lastName);
      expect(response.body.role).toBe(userData.role);
      expect(response.body.isActive).toBe(true);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'invalid-email',
        firstName: '',
      };

      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(invalidData)
        .expect(400);
    });

    it('should prevent duplicate email', async () => {
      const userData = {
        email: 'existing@company.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'Employee'
      };

      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(userData)
        .expect(409);
    });

    it('should require admin role', async () => {
      const userData = {
        email: 'test@company.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'Employee'
      };

      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(userData)
        .expect(403);
    });
  });
});