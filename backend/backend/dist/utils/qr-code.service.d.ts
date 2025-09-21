import * as QRCode from 'qrcode';
export declare class QrCodeService {
    private readonly logger;
    generateQRCode(data: string, options?: QRCode.QRCodeToBufferOptions): Promise<Buffer>;
    generateQRCodeDataURL(data: string, options?: QRCode.QRCodeToDataURLOptions): Promise<string>;
    generateEquipmentQRCode(equipmentId: string): string;
    generateEquipmentQRCodeImage(equipmentId: string, qrCode: string): Promise<Buffer>;
    parseEquipmentQRCode(qrData: string): {
        equipmentId: string;
        code: string;
    } | null;
    validateQRCodeFormat(qrCode: string): boolean;
}
