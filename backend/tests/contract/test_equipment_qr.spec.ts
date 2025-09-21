import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Equipment QR Code API Contract Tests', () => {
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

  describe('GET /api/equipment/qr/{qrCode}', () => {
    it('should return equipment details by valid QR code', async () => {
      const qrCode = 'valid-qr-code-string';

      const response = await request(app.getHttpServer())
        .get(`/api/equipment/qr/${encodeURIComponent(qrCode)}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('serialNumber');
      expect(response.body).toHaveProperty('qrCode', qrCode);
      expect(response.body).toHaveProperty('brand');
      expect(response.body).toHaveProperty('model');
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('condition');
      expect(response.body).toHaveProperty('currentOwner');
      expect(response.body).toHaveProperty('transferHistory');
    });

    it('should include current owner information', async () => {
      const qrCode = 'assigned-equipment-qr-code';

      const response = await request(app.getHttpServer())
        .get(`/api/equipment/qr/${encodeURIComponent(qrCode)}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      if (response.body.currentOwner) {
        expect(response.body.currentOwner).toHaveProperty('id');
        expect(response.body.currentOwner).toHaveProperty('firstName');
        expect(response.body.currentOwner).toHaveProperty('lastName');
        expect(response.body.currentOwner).toHaveProperty('email');
        expect(response.body.currentOwner).toHaveProperty('role');
        // Should not include sensitive information
        expect(response.body.currentOwner).not.toHaveProperty('password');
      }
    });

    it('should include transfer history for audit trail', async () => {
      const qrCode = 'equipment-with-history-qr';

      const response = await request(app.getHttpServer())
        .get(`/api/equipment/qr/${encodeURIComponent(qrCode)}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body.transferHistory).toBeInstanceOf(Array);

      if (response.body.transferHistory.length > 0) {
        const transfer = response.body.transferHistory[0];
        expect(transfer).toHaveProperty('id');
        expect(transfer).toHaveProperty('transferType');
        expect(transfer).toHaveProperty('reason');
        expect(transfer).toHaveProperty('transferredAt');
        expect(transfer).toHaveProperty('fromUser');
        expect(transfer).toHaveProperty('toUser');
      }
    });

    it('should enforce role-based visibility on QR scan', async () => {
      const qrCode = 'other-team-equipment-qr';

      // Employee should be able to scan but with limited info
      const response = await request(app.getHttpServer())
        .get(`/api/equipment/qr/${encodeURIComponent(qrCode)}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .expect(200);

      expect(response.body).toHaveProperty('serialNumber');
      expect(response.body).toHaveProperty('brand');
      expect(response.body).toHaveProperty('model');
      expect(response.body).toHaveProperty('status');

      // Employee may not see full transfer history for other team's equipment
      if (response.body.transferHistory) {
        expect(response.body.transferHistory).toBeInstanceOf(Array);
      }
    });

    it('should allow mobile scanning with proper headers', async () => {
      const qrCode = 'mobile-scanned-qr-code';

      const response = await request(app.getHttpServer())
        .get(`/api/equipment/qr/${encodeURIComponent(qrCode)}`)
        .set('Authorization', 'Bearer mobile-app-jwt-token')
        .set('User-Agent', 'MobileApp/1.0')
        .set('X-Scan-Source', 'camera')
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('mobileOptimized', true);

      // Mobile response should include quick action capabilities
      expect(response.body).toHaveProperty('availableActions');
      expect(response.body.availableActions).toBeInstanceOf(Array);
    });

    it('should handle URL-encoded QR codes properly', async () => {
      const qrCodeWithSpecialChars = 'qr-code-with-/+=chars';
      const encodedQrCode = encodeURIComponent(qrCodeWithSpecialChars);

      const response = await request(app.getHttpServer())
        .get(`/api/equipment/qr/${encodedQrCode}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body.qrCode).toBe(qrCodeWithSpecialChars);
    });

    it('should return 404 for invalid QR code', async () => {
      const invalidQrCode = 'non-existent-qr-code';

      await request(app.getHttpServer())
        .get(`/api/equipment/qr/${encodeURIComponent(invalidQrCode)}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(404);
    });

    it('should return 404 for malformed QR code', async () => {
      const malformedQrCode = '';

      await request(app.getHttpServer())
        .get(`/api/equipment/qr/${malformedQrCode}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(404);
    });

    it('should require authentication for QR scanning', async () => {
      const qrCode = 'valid-qr-code-string';

      await request(app.getHttpServer())
        .get(`/api/equipment/qr/${encodeURIComponent(qrCode)}`)
        .expect(401);
    });

    it('should handle QR scanning performance within 2 seconds', async () => {
      const qrCode = 'performance-test-qr-code';
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get(`/api/equipment/qr/${encodeURIComponent(qrCode)}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      const responseTime = Date.now() - startTime;

      // API should respond within 2 seconds as per requirement
      expect(responseTime).toBeLessThan(2000);
      expect(response.body).toHaveProperty('responseTime');
    });

    it('should log QR scan events for audit', async () => {
      const qrCode = 'audit-tracked-qr-code';

      const response = await request(app.getHttpServer())
        .get(`/api/equipment/qr/${encodeURIComponent(qrCode)}`)
        .set('Authorization', 'Bearer employee-jwt-token')
        .expect(200);

      // Response should indicate that scan was logged
      expect(response.body).toHaveProperty('scanLogged', true);
      expect(response.body).toHaveProperty('scanTimestamp');
    });

    it('should provide condition reporting capability from QR scan', async () => {
      const qrCode = 'user-owned-equipment-qr';

      const response = await request(app.getHttpServer())
        .get(`/api/equipment/qr/${encodeURIComponent(qrCode)}`)
        .set('Authorization', 'Bearer equipment-owner-jwt-token')
        .expect(200);

      // Owner should be able to report condition
      expect(response.body.availableActions).toContain('reportCondition');
      expect(response.body).toHaveProperty('canReportCondition', true);
    });
  });
});