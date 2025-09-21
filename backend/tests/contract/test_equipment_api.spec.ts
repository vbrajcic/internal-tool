import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Equipment API Contract Tests', () => {
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

  describe('GET /api/equipment', () => {
    it('should return equipment list with filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/equipment?status=Available&type=Laptop')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body).toHaveProperty('equipment');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.equipment).toBeInstanceOf(Array);

      response.body.equipment.forEach((item: any) => {
        expect(item.status).toBe('Available');
        expect(item.type).toBe('Laptop');
        expect(item).toHaveProperty('qrCode');
        expect(item).toHaveProperty('serialNumber');
      });
    });

    it('should enforce role-based visibility', async () => {
      // Employee should only see their own equipment
      const response = await request(app.getHttpServer())
        .get('/api/equipment')
        .set('Authorization', 'Bearer employee-jwt-token')
        .expect(200);

      response.body.equipment.forEach((item: any) => {
        expect(item.currentOwnerId).toBe('employee-user-id');
      });
    });
  });

  describe('POST /api/equipment', () => {
    it('should register new equipment with QR code generation', async () => {
      const equipmentData = {
        serialNumber: 'LAP-001-2024',
        brand: 'Dell',
        model: 'Latitude 7420',
        type: 'Laptop',
        purchaseDate: '2024-01-15',
        classificationTag: 'Profico',
        condition: 'New'
      };

      const response = await request(app.getHttpServer())
        .post('/api/equipment')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(equipmentData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('qrCode');
      expect(response.body.qrCode).toBeTruthy();
      expect(response.body.serialNumber).toBe(equipmentData.serialNumber);
      expect(response.body.status).toBe('Available');
      expect(response.body.currentOwnerId).toBeNull();
    });

    it('should validate unique serial number', async () => {
      const equipmentData = {
        serialNumber: 'EXISTING-SERIAL-001',
        brand: 'Apple',
        model: 'MacBook Pro',
        type: 'Laptop',
        purchaseDate: '2024-01-15',
        classificationTag: 'Profico'
      };

      await request(app.getHttpServer())
        .post('/api/equipment')
        .set('Authorization', 'Bearer admin-jwt-token')
        .send(equipmentData)
        .expect(409);
    });

    it('should require admin role for equipment registration', async () => {
      const equipmentData = {
        serialNumber: 'LAP-002-2024',
        brand: 'HP',
        model: 'EliteBook 850',
        type: 'Laptop',
        purchaseDate: '2024-01-15',
        classificationTag: 'ZOPI'
      };

      await request(app.getHttpServer())
        .post('/api/equipment')
        .set('Authorization', 'Bearer employee-jwt-token')
        .send(equipmentData)
        .expect(403);
    });
  });
});