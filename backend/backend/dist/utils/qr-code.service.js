"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var QrCodeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrCodeService = void 0;
const common_1 = require("@nestjs/common");
const QRCode = require("qrcode");
let QrCodeService = QrCodeService_1 = class QrCodeService {
    constructor() {
        this.logger = new common_1.Logger(QrCodeService_1.name);
    }
    async generateQRCode(data, options) {
        try {
            const defaultOptions = {
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
        }
        catch (error) {
            this.logger.error('Failed to generate QR code:', error);
            throw new Error(`QR code generation failed: ${error.message}`);
        }
    }
    async generateQRCodeDataURL(data, options) {
        try {
            const defaultOptions = {
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
        }
        catch (error) {
            this.logger.error('Failed to generate QR code data URL:', error);
            throw new Error(`QR code data URL generation failed: ${error.message}`);
        }
    }
    generateEquipmentQRCode(equipmentId) {
        const year = new Date().getFullYear();
        const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
        return `EQ-${year}-${randomPart}`;
    }
    async generateEquipmentQRCodeImage(equipmentId, qrCode) {
        try {
            const qrData = JSON.stringify({
                type: 'equipment',
                id: equipmentId,
                code: qrCode,
                timestamp: new Date().toISOString(),
            });
            return await this.generateQRCode(qrData, {
                width: 400,
                margin: 4,
                errorCorrectionLevel: 'H',
            });
        }
        catch (error) {
            this.logger.error(`Failed to generate equipment QR code for ${equipmentId}:`, error);
            throw error;
        }
    }
    parseEquipmentQRCode(qrData) {
        try {
            const parsed = JSON.parse(qrData);
            if (parsed.type === 'equipment' && parsed.id && parsed.code) {
                return {
                    equipmentId: parsed.id,
                    code: parsed.code,
                };
            }
            return null;
        }
        catch (error) {
            if (typeof qrData === 'string' && qrData.match(/^EQ-\d{4}-[A-Z0-9]{8}$/)) {
                return {
                    equipmentId: '',
                    code: qrData,
                };
            }
            this.logger.warn(`Failed to parse QR code data: ${qrData}`);
            return null;
        }
    }
    validateQRCodeFormat(qrCode) {
        const equipmentPattern = /^EQ-\d{4}-[A-Z0-9]{8}$/;
        return equipmentPattern.test(qrCode);
    }
};
exports.QrCodeService = QrCodeService;
exports.QrCodeService = QrCodeService = QrCodeService_1 = __decorate([
    (0, common_1.Injectable)()
], QrCodeService);
//# sourceMappingURL=qr-code.service.js.map