import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QrCodeService {
  private readonly logger = new Logger(QrCodeService.name);

  async generateQRCode(data: string, options?: QRCode.QRCodeToBufferOptions): Promise<Buffer> {
    try {
      const defaultOptions: QRCode.QRCodeToBufferOptions = {
        type: 'png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
        ...options,
      };

      this.logger.log(`Generating QR code for data: ${data.substring(0, 50)}...`);

      const qrBuffer = await QRCode.toBuffer(data, defaultOptions);

      this.logger.log('QR code generated successfully');
      return qrBuffer;
    } catch (error) {
      this.logger.error('Failed to generate QR code:', error);
      throw new Error(`QR code generation failed: ${error.message}`);
    }
  }

  async generateQRCodeDataURL(data: string, options?: QRCode.QRCodeToDataURLOptions): Promise<string> {
    try {
      const defaultOptions: QRCode.QRCodeToDataURLOptions = {
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
        ...options,
      };

      this.logger.log(`Generating QR code data URL for: ${data.substring(0, 50)}...`);

      const dataURL = await QRCode.toDataURL(data, defaultOptions);

      this.logger.log('QR code data URL generated successfully');
      return dataURL;
    } catch (error) {
      this.logger.error('Failed to generate QR code data URL:', error);
      throw new Error(`QR code data URL generation failed: ${error.message}`);
    }
  }

  generateEquipmentQRCode(equipmentId: string): string {
    // Generate a unique QR code string for equipment
    // Format: EQ-YYYY-XXXXXXXX where YYYY is year and X is random
    const year = new Date().getFullYear();
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `EQ-${year}-${randomPart}`;
  }

  async generateEquipmentQRCodeImage(equipmentId: string, qrCode: string): Promise<Buffer> {
    try {
      // Create QR code data with equipment information
      const qrData = JSON.stringify({
        type: 'equipment',
        id: equipmentId,
        code: qrCode,
        timestamp: new Date().toISOString(),
      });

      return await this.generateQRCode(qrData, {
        width: 400,
        margin: 4,
        errorCorrectionLevel: 'H', // Higher error correction for equipment tags
      });
    } catch (error) {
      this.logger.error(`Failed to generate equipment QR code for ${equipmentId}:`, error);
      throw error;
    }
  }

  parseEquipmentQRCode(qrData: string): { equipmentId: string; code: string } | null {
    try {
      const parsed = JSON.parse(qrData);

      if (parsed.type === 'equipment' && parsed.id && parsed.code) {
        return {
          equipmentId: parsed.id,
          code: parsed.code,
        };
      }

      return null;
    } catch (error) {
      // Try to parse as legacy format (just the QR code string)
      if (typeof qrData === 'string' && qrData.match(/^EQ-\d{4}-[A-Z0-9]{8}$/)) {
        return {
          equipmentId: '', // Will need to be looked up by QR code
          code: qrData,
        };
      }

      this.logger.warn(`Failed to parse QR code data: ${qrData}`);
      return null;
    }
  }

  validateQRCodeFormat(qrCode: string): boolean {
    // Validate equipment QR code format: EQ-YYYY-XXXXXXXX
    const equipmentPattern = /^EQ-\d{4}-[A-Z0-9]{8}$/;
    return equipmentPattern.test(qrCode);
  }
}